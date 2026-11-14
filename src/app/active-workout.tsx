/**
 * ACTIVE WORKOUT — the live gym screen: elapsed timer, rest countdown,
 * exercises with sets to tick off, "last time" and PR hints.
 * The workout is saved in the store as you go, so closing the app doesn't lose it.
 */
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { PlateCalc } from '@/components/PlateCalc';
import { SlideToFinish } from '@/components/SlideToFinish';
import { FIELD_LABEL, WorkoutKeypad, type KeypadField } from '@/components/WorkoutKeypad';
import { secondsText, useUnits } from '@/lib/units';
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { libraryExercise, trackMode, type TrackMode } from '@/data/exercises';
import { program as findProgram } from '@/data/programs';
import { haptics } from '@/lib/haptics';
import { REST_OPTIONS, cancelRestNotification, formatDuration, restLabel, scheduleRestNotification, useNow } from '@/lib/workoutTimer';
import { todayKey } from '@/store/dates';
import { detectRecords, exerciseHistory, exerciseRecords, setRecord, suggestNext } from '@/store/exercises';
import { useStore } from '@/store/store';
import type { ActiveWorkout, Exercise, ExerciseSet, Workout } from '@/store/types';

const num = (v: string) => Number(v.replace(',', '.')) || 0;

/** The cells you fill in per set, for each way of logging. */
const FIELDS: Record<TrackMode, KeypadField[]> = {
  weight: ['weight', 'reps'],
  bodyweight: ['weight', 'reps'],
  time: ['seconds'],
  distance: ['meters', 'weight'],
};
const hasValue = (x: ExerciseSet) => x.reps > 0 || (x.seconds ?? 0) > 0 || (x.meters ?? 0) > 0;
type Editing = { ex: number; set: number; field: KeypadField };

type SetType = 'normal' | 'warmup' | 'drop' | 'failure';
const setType = (set: ExerciseSet): SetType => (set.warmup ? 'warmup' : set.kind ?? 'normal');
const SET_COLORS: Record<SetType, string> = { normal: Colors.textMuted, warmup: Colors.fat, drop: Colors.carbs, failure: Colors.danger };

/** Tap a set number: choose warm-up, drop set, to failure, or how hard it felt (RPE). */
function setTypeMenu(set: ExerciseSet, onChange: (c: Partial<ExerciseSet>) => void) {
  Alert.alert('Set type', 'Warm-up sets do not count for records.', [
    { text: 'Normal set', onPress: () => onChange({ warmup: false, kind: undefined }) },
    { text: 'Warm-up', onPress: () => onChange({ warmup: true, kind: undefined }) },
    { text: 'Drop set', onPress: () => onChange({ warmup: false, kind: 'drop' }) },
    { text: 'To failure', onPress: () => onChange({ warmup: false, kind: 'failure' }) },
    {
      text: set.rpe ? `How hard (now ${set.rpe})` : 'How hard was it (RPE)',
      onPress: () =>
        Alert.alert('How hard was it?', '10 means nothing left, 8 means two reps left, 6 is easy.', [
          ...[10, 9, 8, 7, 6].map((n) => ({ text: String(n), onPress: () => onChange({ rpe: n }) })),
          { text: 'Clear', onPress: () => onChange({ rpe: undefined }) },
        ]),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export default function ActiveWorkoutScreen() {
  const { state, dispatch } = useStore();
  const aw = state.activeWorkout;
  const now = useNow();
  const [plates, setPlates] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [draft, setDraft] = useState('');
  const units = useUnits();
  const restDone = useRef<string | null>(null);
  useKeepAwake();

  // Patches are merged into the newest workout in the store, so a slow step
  // (like scheduling the rest notification) can never undo a newer change.
  const update = (changes: Partial<ActiveWorkout>) => dispatch({ type: 'patchActiveWorkout', changes });

  // Rest countdown reached zero while the app is open: buzz once.
  const restLeft = aw?.restUntil ? Math.ceil((new Date(aw.restUntil).getTime() - now) / 1000) : 0;
  useEffect(() => {
    if (aw?.restUntil && restLeft <= 0 && restDone.current !== aw.restUntil) {
      restDone.current = aw.restUntil;
      haptics.success();
      update({ restUntil: undefined, restNotificationId: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restLeft, aw?.restUntil]);

  if (!aw) {
    return (
      <View style={[s.center, { padding: Spacing.xl, gap: Spacing.md }]}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Ionicons name="barbell" size={44} color={Colors.lime} />
        <Text style={[ui.text, { textAlign: 'center' }]}>No workout in progress.</Text>
        <Button title="Start a workout" icon="play" onPress={() => router.replace('/coach')} />
      </View>
    );
  }

  const elapsed = Math.floor((now - new Date(aw.startedAt).getTime()) / 1000);
  const doneSets = aw.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0);
  const volume = aw.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done && !x.warmup).reduce((v, x) => v + x.reps * x.weight, 0), 0);

  const setExercises = (exercises: Exercise[]) => update({ exercises });
  const updateExercise = (i: number, changes: Partial<Exercise>) => setExercises(aw.exercises.map((e, idx) => (idx === i ? { ...e, ...changes } : e)));
  const updateSet = (i: number, j: number, changes: Partial<ExerciseSet>) =>
    updateExercise(i, { sets: aw.exercises[i].sets.map((x, idx) => (idx === j ? { ...x, ...changes } : x)) });

  const startRest = async (seconds: number) => {
    const id = await scheduleRestNotification(seconds);
    update({ restUntil: new Date(Date.now() + seconds * 1000).toISOString(), restSeconds: seconds, restNotificationId: id ?? undefined });
  };

  const adjustRest = async (delta: number) => {
    const left = Math.max(0, restLeft + delta);
    if (left === 0) return skipRest();
    await startRest(left);
  };

  const skipRest = async () => {
    await cancelRestNotification();
    restDone.current = aw.restUntil ?? null;
    update({ restUntil: undefined, restNotificationId: undefined });
  };

  const toggleDone = (i: number, j: number, fill?: Partial<ExerciseSet>) => {
    const ex = aw.exercises[i];
    const done = !ex.sets[j].done;
    haptics.tap();
    updateSet(i, j, { ...fill, done });
    // In a superset you go straight to the next exercise; the rest comes after the last one.
    const nextInSuperset = ex.superset && aw.exercises[i + 1]?.superset === ex.superset;
    const rest = ex.restSeconds ?? state.settings.restSeconds;
    if (done && !nextInSuperset && rest > 0) startRest(rest);
  };

  const toggleSuperset = (i: number) => {
    const ex = aw.exercises[i];
    const next = aw.exercises[i + 1];
    if (ex.superset && next?.superset === ex.superset) {
      // Unlink from the next exercise; a group of one is no superset.
      const list = aw.exercises.map((e, idx) => (idx === i + 1 ? { ...e, superset: undefined } : e));
      const left = list.filter((e) => e.superset === ex.superset).length;
      setExercises(left < 2 ? list.map((e) => (e.superset === ex.superset ? { ...e, superset: undefined } : e)) : list);
      return;
    }
    if (!next) return;
    const used = new Set(aw.exercises.map((e) => e.superset).filter(Boolean));
    const letter = ex.superset ?? next.superset ?? 'ABCDEFGH'.split('').find((l) => !used.has(l)) ?? 'A';
    setExercises(aw.exercises.map((e, idx) => (idx === i || idx === i + 1 ? { ...e, superset: letter } : e)));
  };

  const setNote = (name: string, note: string) =>
    dispatch({ type: 'apply', change: (s) => ({ exerciseNotes: { ...s.exerciseNotes, [name]: note.trim() } }) });

  const addSet = (i: number) => {
    const sets = aw.exercises[i].sets;
    const last = sets[sets.length - 1];
    updateExercise(i, { sets: [...sets, { reps: last?.reps ?? 0, weight: last?.weight ?? 0, seconds: last?.seconds, meters: last?.meters, done: false }] });
  };

  const removeSet = (i: number, j: number) => {
    const sets = aw.exercises[i].sets.filter((_, idx) => idx !== j);
    updateExercise(i, { sets: sets.length ? sets : [{ reps: 0, weight: 0, done: false }] });
  };

  const removeExercise = (i: number) => {
    const ex = aw.exercises[i];
    const run = () => setExercises(aw.exercises.filter((_, idx) => idx !== i));
    if (ex.sets.some((x) => x.done)) {
      Alert.alert('Remove exercise?', `${ex.name} has sets you already did.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: run },
      ]);
    } else run();
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= aw.exercises.length) return;
    const list = [...aw.exercises];
    [list[i], list[j]] = [list[j], list[i]];
    setExercises(list);
  };

  // ---- number pad ----
  const modeOf = (i: number) => trackMode(aw.exercises[i]?.name ?? '', state.customExercises);
  /** What a cell shows now, in your units. */
  const cellValue = (e: Editing) => {
    const set = aw.exercises[e.ex]?.sets[e.set];
    if (!set) return 0;
    if (e.field === 'weight') return units.show(set.weight);
    return set[e.field] ?? 0;
  };
  const commitDraft = () => {
    if (!editing || draft === '') return;
    const v = num(draft);
    const value = editing.field === 'weight' ? units.toKg(v) : Math.round(v);
    updateSet(editing.ex, editing.set, { [editing.field]: value });
    setDraft('');
  };
  const openCell = (e: Editing) => {
    commitDraft();
    setEditing(e);
    setDraft('');
  };
  const nextCell = () => {
    if (!editing) return;
    commitDraft();
    const fields = FIELDS[modeOf(editing.ex)];
    const f = fields.indexOf(editing.field);
    if (f < fields.length - 1) return setEditing({ ...editing, field: fields[f + 1] });
    if (editing.set < aw.exercises[editing.ex].sets.length - 1) return setEditing({ ex: editing.ex, set: editing.set + 1, field: fields[0] });
    if (editing.ex < aw.exercises.length - 1) return setEditing({ ex: editing.ex + 1, set: 0, field: FIELDS[modeOf(editing.ex + 1)][0] });
    setEditing(null);
  };
  const keyPress = (k: string) => {
    if (k === 'del') return setDraft((d) => d.slice(0, -1));
    if (k === '.' && draft.includes('.')) return;
    if (draft.replace('.', '').length >= 5) return;
    setDraft((d) => (k === '.' && !d ? '0.' : d + k));
  };
  const stepBy = (delta: number) => {
    if (!editing) return;
    const base = draft !== '' ? num(draft) : cellValue(editing);
    const v = Math.max(0, Math.round((base + delta) * 100) / 100);
    setDraft(String(v));
  };
  const stepFor = (field: KeypadField) => (field === 'weight' ? units.step : field === 'seconds' ? 5 : field === 'meters' ? 5 : 1);

  /** Add ramp-up sets before the first work set: about 40, 60 and 80 percent, rounded to what you can load. */
  const addWarmups = (i: number) => {
    const ex = aw.exercises[i];
    const work = ex.sets.find((x) => !x.warmup && x.weight > 0)?.weight ?? exerciseHistory(state, ex.name)[0]?.sets.find((x) => !x.warmup)?.weight ?? 0;
    if (work < 20) {
      Alert.alert('Add a work weight first', 'Fill in the weight of your first work set, then add warm-up sets.');
      return;
    }
    const round = (kg: number) => Math.max(units.unit === 'lb' ? units.toKg(45) : 20, Math.round(kg / 2.5) * 2.5);
    const plan = work >= 60 ? [[0.4, 10], [0.6, 5], [0.8, 3]] : [[0.5, 10], [0.75, 5]];
    const warm = plan.map(([pct, reps]) => ({ weight: round(work * pct), reps, warmup: true, done: false }));
    updateExercise(i, { sets: [...warm, ...ex.sets.filter((x) => !x.warmup)] });
    haptics.add();
  };

  const finish = () => {
    // If you ticked sets off, only the ticked ones count. If you never used the ticks, every filled-in set counts.
    commitDraft();
    const usedTicks = aw.exercises.some((e) => e.sets.some((x) => x.done));
    const exercises = aw.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((x) => hasValue(x) && (!usedTicks || x.done)).map(({ done: _done, ...x }) => x) }))
      .filter((e) => e.sets.length > 0);
    if (exercises.length === 0) {
      Alert.alert('Nothing logged yet', 'Fill in at least one set, or discard the workout.');
      return;
    }
    const workout: Workout = {
      id: aw.id,
      date: todayKey(),
      type: aw.type,
      title: aw.title.trim() || 'Gym session',
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      exercises,
      photoUri: aw.photoUri,
      tagged: aw.tagged,
      routineId: aw.routineId,
      programDay: aw.programDay,
    };
    workout.prs = detectRecords(state, workout);
    cancelRestNotification();
    dispatch({ type: 'addWorkout', workout });
    if (aw.routineId) dispatch({ type: 'updateRoutine', id: aw.routineId, changes: { lastUsed: todayKey() } });
    if (aw.programDay) {
      const [programId, dayId] = aw.programDay.split(':');
      dispatch({
        type: 'apply',
        change: (s) => {
          const p = findProgram(programId);
          if (!p || s.program?.id !== programId) return {};
          const index = p.days.findIndex((d) => d.id === dayId);
          return { program: { ...s.program, nextDay: index + 1 } };
        },
      });
    }
    dispatch({ type: 'setActiveWorkout', workout: null });
    haptics.success();
    router.replace({ pathname: '/workout/[id]', params: { id: workout.id, fresh: '1' } });
  };

  const discard = () =>
    Alert.alert('Discard workout?', 'Everything you logged in this workout will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          cancelRestNotification();
          dispatch({ type: 'setActiveWorkout', workout: null });
          router.back();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => (
            <Pressable hitSlop={10} onPress={() => router.back()} style={{ paddingRight: 12 }} accessibilityLabel="Minimise workout">
              <Ionicons name="chevron-down" size={26} color={Colors.text} />
            </Pressable>
          ),
          headerTitle: () => <Text style={[Type.heading, { color: Colors.lime, fontVariant: ['tabular-nums'] }]}>{formatDuration(elapsed)}</Text>,
          headerRight: () => <View style={{ width: 26 }} />,
        }}
      />

      {/* Rest timer */}
      {aw.restUntil && restLeft > 0 && (
        <View style={s.rest}>
          <Pressable onPress={() => adjustRest(-15)} hitSlop={8} style={s.restBtn}>
            <Text style={s.restBtnText}>−15</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={ui.statLabel}>REST</Text>
            <Text style={[s.restTime, { fontVariant: ['tabular-nums'] }]}>{formatDuration(restLeft)}</Text>
          </View>
          <Pressable onPress={() => adjustRest(30)} hitSlop={8} style={s.restBtn}>
            <Text style={s.restBtnText}>+30</Text>
          </Pressable>
          <Pressable onPress={skipRest} hitSlop={8} style={[s.restBtn, { backgroundColor: Colors.lime }]}>
            <Text style={[s.restBtnText, { color: Colors.background }]}>Skip</Text>
          </Pressable>
        </View>
      )}

      <FormScroll contentContainerStyle={{ paddingBottom: editing ? 380 : 140 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <TextInput
            style={[Type.title, { color: Colors.text, flex: 1, padding: 0 }]}
            value={aw.title}
            onChangeText={(title) => update({ title })}
            placeholder="Workout name"
            placeholderTextColor={Colors.textFaint}
          />
          <Text style={ui.muted}>
            {doneSets} sets, {units.show(volume).toLocaleString('en-US')} {units.unit}
          </Text>
        </View>

        {aw.exercises.map((ex, i) => (
          <ExerciseCard
            key={`${ex.name}-${i}`}
            exercise={ex}
            index={i}
            total={aw.exercises.length}
            onRename={(name) => updateExercise(i, { name })}
            onSet={(j, changes) => updateSet(i, j, changes)}
            onToggle={(j, fill) => toggleDone(i, j, fill)}
            onAddSet={() => addSet(i)}
            onRemoveSet={(j) => removeSet(i, j)}
            onRemove={() => removeExercise(i)}
            onMove={(dir) => move(i, dir)}
            onSuperset={() => toggleSuperset(i)}
            linkedNext={Boolean(ex.superset && aw.exercises[i + 1]?.superset === ex.superset)}
            note={state.exerciseNotes[ex.name] ?? ''}
            onNote={(note) => setNote(ex.name, note)}
            onPlates={(w) => setPlates(w)}
            onRest={(seconds) => updateExercise(i, { restSeconds: seconds })}
            defaultRest={state.settings.restSeconds}
            mode={modeOf(i)}
            editing={editing?.ex === i ? editing : null}
            draft={draft}
            onOpenCell={(set, field) => openCell({ ex: i, set, field })}
            onWarmup={() => addWarmups(i)}
          />
        ))}

        <Button title="Add exercise" icon="add" variant="ghost" onPress={() => router.push({ pathname: '/exercise-picker', params: { target: 'active' } })} />
        <Pressable onPress={discard} style={{ padding: 12 }}>
          <Text style={{ color: Colors.danger, textAlign: 'center', fontWeight: '600' }}>Discard workout</Text>
        </Pressable>
      </FormScroll>

      {editing ? (
        <WorkoutKeypad
          label={`${aw.exercises[editing.ex]?.name ?? ''}, set ${editing.set + 1}: ${editing.field === 'weight' ? (modeOf(editing.ex) === 'bodyweight' ? `extra ${units.unit}` : units.unit) : FIELD_LABEL[editing.field].toLowerCase()}`}
          draft={draft}
          step={stepFor(editing.field)}
          decimals={editing.field === 'weight'}
          onKey={keyPress}
          onStep={stepBy}
          onNext={nextCell}
          onDone={() => {
            commitDraft();
            setEditing(null);
          }}
        />
      ) : (
        <View style={s.bottom}>
          <SlideToFinish onFinish={finish} />
        </View>
      )}

      {plates !== null && <PlateCalc weight={plates} onClose={() => setPlates(null)} />}
    </View>
  );
}

function ExerciseCard({
  exercise,
  index,
  total,
  onRename,
  onSet,
  onToggle,
  onAddSet,
  onRemoveSet,
  onRemove,
  onMove,
  onSuperset,
  linkedNext,
  note,
  onNote,
  onPlates,
  onRest,
  defaultRest,
  mode,
  editing,
  draft,
  onOpenCell,
  onWarmup,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  onRename: (name: string) => void;
  onSet: (j: number, changes: Partial<ExerciseSet>) => void;
  onToggle: (j: number, fill?: Partial<ExerciseSet>) => void;
  onAddSet: () => void;
  onRemoveSet: (j: number) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onSuperset: () => void;
  linkedNext: boolean;
  note: string;
  onNote: (note: string) => void;
  onPlates: (weight: number) => void;
  onRest: (seconds: number) => void;
  defaultRest: number;
  mode: TrackMode;
  editing: Editing | null;
  draft: string;
  onOpenCell: (set: number, field: KeypadField) => void;
  onWarmup: () => void;
}) {
  const units = useUnits();
  const { state } = useStore();
  const last = exerciseHistory(state, exercise.name)[0];
  const records = exerciseRecords(state, exercise.name);
  const suggestion = suggestNext(state, exercise.name, exercise.targetReps ?? 8);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(note);

  const menu = () =>
    Alert.alert(exercise.name, undefined, [
      { text: note ? 'Edit note' : 'Add a note', onPress: () => setEditingNote(true) },
      mode === 'weight' ? { text: 'Add warm-up sets', onPress: onWarmup } : null,
      index < total - 1 ? { text: linkedNext ? 'Unlink superset' : 'Superset with next exercise', onPress: onSuperset } : null,
      index > 0 ? { text: 'Move up', onPress: () => onMove(-1) } : null,
      index < total - 1 ? { text: 'Move down', onPress: () => onMove(1) } : null,
      { text: 'How to do it, history and records', onPress: () => router.push({ pathname: '/exercise/[name]', params: { name: exercise.name } }) },
      { text: 'Remove exercise', style: 'destructive' as const, onPress: onRemove },
      { text: 'Cancel', style: 'cancel' as const },
    ].filter((x): x is NonNullable<typeof x> => x !== null));
  const isBar = mode === 'weight' && libraryExercise(exercise.name)?.bar;
  const newPr = exercise.sets.some((x) => x.done && setRecord(state, exercise.name, x));
  const rest = exercise.restSeconds ?? defaultRest;

  return (
    <Card style={{ gap: Spacing.sm, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: exercise.name } })}>
          <Text style={[ui.text, { fontWeight: '800', fontSize: 16 }]}>{exercise.name}</Text>
          <Text style={ui.muted}>
            {records.bestWeight
              ? `Best ${units.text(records.bestWeight.weight)} × ${records.bestWeight.reps}`
              : mode === 'time'
                ? 'Timed sets: fill in seconds.'
                : mode === 'distance'
                  ? 'Distance sets: metres, and kg if you carry weight.'
                  : 'First time. Set your PR today.'}
          </Text>
        </Pressable>
        {newPr && (
          <View style={s.prChip}>
            <Text style={{ color: Colors.background, fontWeight: '900', fontSize: 11 }}>NEW PR</Text>
          </View>
        )}
        <Pressable hitSlop={8} onPress={onRemove} accessibilityLabel="Remove exercise">
          <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
        </Pressable>
        <Pressable hitSlop={10} onPress={menu} accessibilityLabel="Exercise options">
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.textMuted} />
        </Pressable>
      </View>

      {exercise.superset && (
        <Text style={s.superset}>
          Superset {exercise.superset}
          {linkedNext ? '. Go straight to the next exercise, rest after the last one.' : ''}
        </Text>
      )}
      {exercise.targetReps ? <Text style={ui.muted}>Target: {exercise.targetReps} reps in every set</Text> : null}

      {editingNote ? (
        <View style={{ gap: 6 }}>
          <TextInput
            style={[s.input, { textAlign: 'left', paddingHorizontal: 10, minHeight: 44 }]}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Seat height 4, grip just outside the rings"
            placeholderTextColor={Colors.textFaint}
            autoFocus
            multiline
          />
          <Pressable
            onPress={() => {
              onNote(noteText);
              setEditingNote(false);
            }}
            style={s.link}>
            <Ionicons name="checkmark" size={16} color={Colors.lime} />
            <Text style={s.linkText}>Save note</Text>
          </Pressable>
        </View>
      ) : note ? (
        <Pressable onPress={() => setEditingNote(true)} style={s.note}>
          <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
          <Text style={[ui.muted, { flex: 1 }]}>{note}</Text>
        </Pressable>
      ) : null}

      {suggestion && <Text style={{ color: Colors.lime, fontSize: 12, fontWeight: '600' }}>{suggestion.hint}</Text>}

      <View style={s.headRow}>
        <Text style={[s.col, s.colSet, ui.statLabel]}>SET</Text>
        <Text style={[s.col, s.colPrev, ui.statLabel]}>LAST</Text>
        {FIELDS[mode].map((f) => (
          <Text key={f} style={[s.col, s.colNum, ui.statLabel]}>
            {f === 'weight' ? (mode === 'bodyweight' ? `+${units.unit.toUpperCase()}` : units.unit.toUpperCase()) : f === 'seconds' ? 'TIME' : f === 'meters' ? 'METRES' : 'REPS'}
          </Text>
        ))}
        <View style={s.colCheck} />
        <View style={s.colX} />
      </View>

      {exercise.sets.map((set, j) => (
        <SetRow
          key={j}
          index={j}
          set={set}
          previous={last?.sets[j]}
          mode={mode}
          editingField={editing?.set === j ? editing.field : null}
          draft={draft}
          onOpen={(field) => onOpenCell(j, field)}
          onChange={(changes) => onSet(j, changes)}
          onToggle={(fill) => onToggle(j, fill)}
          onRemove={() => onRemoveSet(j)}
        />
      ))}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 }}>
        <Pressable style={s.link} onPress={onAddSet}>
          <Ionicons name="add" size={18} color={Colors.lime} />
          <Text style={s.linkText}>Add set</Text>
        </Pressable>
        {isBar && (
          <Pressable style={s.link} onPress={() => onPlates(exercise.sets.find((x) => x.weight > 0)?.weight ?? 60)}>
            <Ionicons name="disc-outline" size={16} color={Colors.lime} />
            <Text style={s.linkText}>Plates</Text>
          </Pressable>
        )}
        <Pressable
          style={[s.link, { marginLeft: 'auto' }]}
          hitSlop={8}
          accessibilityLabel="Rest timer for this exercise"
          onPress={() =>
            Alert.alert(`Rest after ${exercise.name}`, 'Starts when you tick off a set.', [
              ...REST_OPTIONS.map((sec) => ({ text: sec === rest ? `${restLabel(sec)} (now)` : restLabel(sec), onPress: () => onRest(sec) })),
              { text: 'Cancel', style: 'cancel' as const },
            ])
          }>
          <Ionicons name={rest ? 'timer-outline' : 'timer'} size={16} color={Colors.textMuted} />
          <Text style={[s.linkText, { color: Colors.textMuted }]}>{rest ? `Rest ${formatDuration(rest)}` : 'No rest timer'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function SetRow({
  index,
  set,
  previous,
  mode,
  editingField,
  draft,
  onOpen,
  onChange,
  onToggle,
  onRemove,
}: {
  index: number;
  set: ExerciseSet;
  previous?: ExerciseSet;
  mode: TrackMode;
  editingField: KeypadField | null;
  draft: string;
  onOpen: (field: KeypadField) => void;
  onChange: (changes: Partial<ExerciseSet>) => void;
  onToggle: (fill?: Partial<ExerciseSet>) => void;
  onRemove: () => void;
}) {
  const units = useUnits();
  const show = (field: KeypadField, x: ExerciseSet | undefined) => {
    if (!x) return '';
    if (field === 'weight') return x.weight ? String(units.show(x.weight)) : mode === 'bodyweight' ? '0' : '';
    if (field === 'seconds') return x.seconds ? secondsText(x.seconds) : '';
    if (field === 'meters') return x.meters ? String(x.meters) : '';
    return x.reps ? String(x.reps) : '';
  };
  const label = { weight: mode === 'bodyweight' ? 'Extra weight' : `Weight in ${units.unit}`, reps: 'Reps', seconds: 'Seconds', meters: 'Metres' };
  const filled = (x: ExerciseSet) => (mode === 'time' ? (x.seconds ?? 0) > 0 : mode === 'distance' ? (x.meters ?? 0) > 0 : x.reps > 0);

  return (
    <View style={[s.setRow, set.done && s.setRowDone]}>
      <Pressable
        style={s.colSet}
        onPress={() => setTypeMenu(set, onChange)}
        onLongPress={() => onChange({ warmup: !set.warmup, kind: undefined })}
        accessibilityLabel={`Set ${index + 1}. Tap for warm-up, drop set, failure or RPE`}>
        <Text style={{ color: SET_COLORS[setType(set)], fontWeight: '800' }}>{setType(set) === 'normal' ? index + 1 : setType(set)[0].toUpperCase()}</Text>
        {set.rpe ? <Text style={s.rpe}>@{set.rpe}</Text> : null}
      </Pressable>
      <Text style={[s.col, s.colPrev, ui.muted]} numberOfLines={1}>
        {previous ? units.set(previous) : ''}
      </Text>
      {FIELDS[mode].map((field) => {
        const active = editingField === field;
        const value = active && draft !== '' ? draft : show(field, set);
        const placeholder = show(field, previous) || '';
        return (
          <Pressable
            key={field}
            onPress={() => onOpen(field)}
            style={[s.colNum, s.input, s.cell, set.done && s.inputDone, active && s.inputActive]}
            accessibilityRole="button"
            accessibilityLabel={label[field]}
            accessibilityValue={{ text: value || placeholder || 'empty' }}>
            <Text style={[s.cellText, !value && { color: Colors.textFaint }]} numberOfLines={1}>
              {value || placeholder || '-'}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => {
          // Ticking an empty set uses the placeholder (last time's) values.
          if (!set.done && !filled(set) && previous) {
            onToggle({ reps: previous.reps, weight: set.weight || previous.weight, seconds: previous.seconds, meters: previous.meters });
          } else onToggle();
        }}
        style={[s.colCheck, s.check, set.done && s.checkDone]}
        accessibilityLabel={set.done ? 'Set done' : 'Complete set'}
        hitSlop={6}>
        <Ionicons name="checkmark" size={18} color={set.done ? Colors.background : Colors.textFaint} />
      </Pressable>
      <Pressable onPress={onRemove} style={s.colX} hitSlop={8} accessibilityLabel="Remove set">
        <Ionicons name="close" size={16} color={Colors.textFaint} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  finish: { backgroundColor: Colors.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  rest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#18200F',
    borderBottomWidth: 1,
    borderBottomColor: Colors.limeBorder,
  },
  restTime: { color: Colors.lime, fontSize: 30, fontWeight: '900', lineHeight: 34 },
  restBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.cardRaised, borderWidth: 1, borderColor: Colors.border },
  restBtnText: { color: Colors.text, fontWeight: '800' },
  prChip: { backgroundColor: Colors.lime, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 2, borderRadius: Radius.sm },
  setRowDone: { backgroundColor: '#1C2612' },
  inputActive: { borderColor: Colors.lime, borderWidth: 2 },
  cell: { alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  cellText: { color: Colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  bottom: { padding: Spacing.lg, paddingBottom: Spacing.xl, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  col: { textAlign: 'center' },
  colSet: { width: 30, alignItems: 'center' },
  colPrev: { width: 64, fontSize: 12 },
  colNum: { flex: 1 },
  colCheck: { width: 36, alignItems: 'center' },
  colX: { width: 22, alignItems: 'center' },
  input: {
    backgroundColor: Colors.cardRaised,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 0,
  },
  inputDone: { backgroundColor: 'transparent', borderColor: 'transparent' },
  check: { height: 34, borderRadius: Radius.sm, backgroundColor: Colors.cardRaised, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  checkDone: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  linkText: { color: Colors.lime, fontWeight: '700' },
  superset: { color: Colors.carbs, fontSize: 12, fontWeight: '800' },
  note: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: Colors.cardRaised, padding: 8, borderRadius: Radius.sm },
  rpe: { color: Colors.textFaint, fontSize: 9, fontWeight: '700' },
});
