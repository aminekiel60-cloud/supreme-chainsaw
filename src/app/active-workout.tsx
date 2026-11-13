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
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { libraryExercise } from '@/data/exercises';
import { haptics } from '@/lib/haptics';
import { cancelRestNotification, formatDuration, scheduleRestNotification, useNow } from '@/lib/workoutTimer';
import { todayKey } from '@/store/dates';
import { detectRecords, exerciseHistory, exerciseRecords, oneRepMax, suggestNext } from '@/store/exercises';
import { useStore } from '@/store/store';
import type { ActiveWorkout, Exercise, ExerciseSet, Workout } from '@/store/types';

const num = (v: string) => Number(v.replace(',', '.')) || 0;

export default function ActiveWorkoutScreen() {
  const { state, dispatch } = useStore();
  const aw = state.activeWorkout;
  const now = useNow();
  const [plates, setPlates] = useState<number | null>(null);
  const restDone = useRef<string | null>(null);
  useKeepAwake();

  const update = (changes: Partial<ActiveWorkout>) => aw && dispatch({ type: 'setActiveWorkout', workout: { ...aw, ...changes } });

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
        <Button title="Start a workout" icon="play" onPress={() => router.replace('/training')} />
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
    await cancelRestNotification(aw.restNotificationId);
    const id = await scheduleRestNotification(seconds);
    update({ restUntil: new Date(Date.now() + seconds * 1000).toISOString(), restSeconds: seconds, restNotificationId: id ?? undefined });
  };

  const adjustRest = async (delta: number) => {
    const left = Math.max(0, restLeft + delta);
    if (left === 0) return skipRest();
    await startRest(left);
  };

  const skipRest = async () => {
    await cancelRestNotification(aw.restNotificationId);
    restDone.current = aw.restUntil ?? null;
    update({ restUntil: undefined, restNotificationId: undefined });
  };

  const toggleDone = (i: number, j: number) => {
    const set = aw.exercises[i].sets[j];
    const done = !set.done;
    haptics.tap();
    updateSet(i, j, { done });
    if (done) startRest(aw.exercises[i].restSeconds ?? state.settings.restSeconds);
  };

  const addSet = (i: number) => {
    const sets = aw.exercises[i].sets;
    const last = sets[sets.length - 1];
    updateExercise(i, { sets: [...sets, { reps: last?.reps ?? 0, weight: last?.weight ?? 0, done: false }] });
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

  const finish = () => {
    const exercises = aw.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((x) => x.reps > 0).map(({ done: _done, ...x }) => x) }))
      .filter((e) => e.sets.length > 0);
    if (exercises.length === 0) {
      Alert.alert('Nothing logged yet', 'Fill in reps for at least one set, or discard the workout.');
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
    };
    workout.prs = detectRecords(state, workout);
    cancelRestNotification(aw.restNotificationId);
    dispatch({ type: 'addWorkout', workout });
    if (aw.routineId) dispatch({ type: 'updateRoutine', id: aw.routineId, changes: { lastUsed: todayKey() } });
    dispatch({ type: 'setActiveWorkout', workout: null });
    haptics.success();
    router.replace({ pathname: '/workout/[id]', params: { id: workout.id } });
  };

  const discard = () =>
    Alert.alert('Discard workout?', 'Everything you logged in this workout will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          cancelRestNotification(aw.restNotificationId);
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
            <Pressable hitSlop={10} onPress={() => router.back()} style={{ paddingRight: 12 }}>
              <Ionicons name="chevron-down" size={26} color={Colors.text} />
            </Pressable>
          ),
          headerTitle: () => <Text style={[Type.heading, { color: Colors.lime, fontVariant: ['tabular-nums'] }]}>{formatDuration(elapsed)}</Text>,
          headerRight: () => (
            <Pressable onPress={finish} style={s.finish}>
              <Text style={{ color: Colors.background, fontWeight: '900' }}>Finish</Text>
            </Pressable>
          ),
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

      <FormScroll>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <TextInput
            style={[Type.title, { color: Colors.text, flex: 1, padding: 0 }]}
            value={aw.title}
            onChangeText={(title) => update({ title })}
            placeholder="Workout name"
            placeholderTextColor={Colors.textFaint}
          />
          <Text style={ui.muted}>
            {doneSets} sets · {volume.toLocaleString('en-US')} kg
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
            onToggle={(j) => toggleDone(i, j)}
            onAddSet={() => addSet(i)}
            onRemoveSet={(j) => removeSet(i, j)}
            onRemove={() => removeExercise(i)}
            onMove={(dir) => move(i, dir)}
            onPlates={(w) => setPlates(w)}
            onRest={(seconds) => updateExercise(i, { restSeconds: seconds })}
            defaultRest={state.settings.restSeconds}
          />
        ))}

        <Button title="Add exercise" icon="add" variant="ghost" onPress={() => router.push({ pathname: '/exercise-picker', params: { target: 'active' } })} />
        <Pressable onPress={discard} style={{ padding: 12 }}>
          <Text style={{ color: Colors.danger, textAlign: 'center', fontWeight: '600' }}>Discard workout</Text>
        </Pressable>
      </FormScroll>

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
  onPlates,
  onRest,
  defaultRest,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  onRename: (name: string) => void;
  onSet: (j: number, changes: Partial<ExerciseSet>) => void;
  onToggle: (j: number) => void;
  onAddSet: () => void;
  onRemoveSet: (j: number) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onPlates: (weight: number) => void;
  onRest: (seconds: number) => void;
  defaultRest: number;
}) {
  const { state } = useStore();
  const last = exerciseHistory(state, exercise.name)[0];
  const records = exerciseRecords(state, exercise.name);
  const suggestion = suggestNext(state, exercise.name);
  const isBar = libraryExercise(exercise.name)?.bar;
  const bestNow = Math.max(0, ...exercise.sets.filter((x) => x.done && !x.warmup).map(oneRepMax));
  const newPr = records.best1RM && bestNow > records.best1RM.value;
  const rest = exercise.restSeconds ?? defaultRest;

  return (
    <Card style={{ gap: Spacing.sm, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: exercise.name } })}>
          <Text style={[ui.text, { fontWeight: '800', fontSize: 16 }]}>{exercise.name}</Text>
          <Text style={ui.muted}>
            {records.best1RM ? `PR ${records.bestWeight!.weight} kg × ${records.bestWeight!.reps} · est. 1RM ${records.best1RM.value} kg` : 'First time — set your PR today'}
          </Text>
        </Pressable>
        {newPr && (
          <View style={s.prChip}>
            <Text style={{ color: Colors.background, fontWeight: '900', fontSize: 11 }}>NEW PR</Text>
          </View>
        )}
        <Pressable hitSlop={8} onPress={() => onMove(-1)} disabled={index === 0}>
          <Ionicons name="chevron-up" size={20} color={index === 0 ? Colors.textFaint : Colors.textMuted} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => onMove(1)} disabled={index === total - 1}>
          <Ionicons name="chevron-down" size={20} color={index === total - 1 ? Colors.textFaint : Colors.textMuted} />
        </Pressable>
        <Pressable hitSlop={8} onPress={onRemove}>
          <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
        </Pressable>
      </View>

      {suggestion && <Text style={{ color: Colors.lime, fontSize: 12, fontWeight: '600' }}>💡 {suggestion.hint}</Text>}

      <View style={s.headRow}>
        <Text style={[s.col, s.colSet, ui.statLabel]}>SET</Text>
        <Text style={[s.col, s.colPrev, ui.statLabel]}>LAST</Text>
        <Text style={[s.col, s.colNum, ui.statLabel]}>KG</Text>
        <Text style={[s.col, s.colNum, ui.statLabel]}>REPS</Text>
        <View style={s.colCheck} />
        <View style={s.colX} />
      </View>

      {exercise.sets.map((set, j) => (
        <SetRow
          key={j}
          index={j}
          set={set}
          previous={last?.sets[j]}
          onChange={(changes) => onSet(j, changes)}
          onToggle={() => onToggle(j)}
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
        <Pressable style={[s.link, { marginLeft: 'auto' }]} onPress={() => onRest(rest >= 180 ? 60 : rest + 30)}>
          <Ionicons name="timer-outline" size={16} color={Colors.textMuted} />
          <Text style={[s.linkText, { color: Colors.textMuted }]}>Rest {formatDuration(rest)}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function SetRow({
  index,
  set,
  previous,
  onChange,
  onToggle,
  onRemove,
}: {
  index: number;
  set: ExerciseSet;
  previous?: ExerciseSet;
  onChange: (changes: Partial<ExerciseSet>) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  // Local text so "7." and "" don't fight with the number in the store.
  const [weight, setWeight] = useState(set.weight ? String(set.weight) : '');
  const [reps, setReps] = useState(set.reps ? String(set.reps) : '');

  return (
    <View style={[s.setRow, set.done && s.setRowDone]}>
      <Pressable style={s.colSet} onLongPress={() => onChange({ warmup: !set.warmup })}>
        <Text style={{ color: set.warmup ? Colors.fat : Colors.textMuted, fontWeight: '800' }}>{set.warmup ? 'W' : index + 1}</Text>
      </Pressable>
      <Text style={[s.col, s.colPrev, ui.muted]} numberOfLines={1}>
        {previous ? `${previous.weight}×${previous.reps}` : '—'}
      </Text>
      <TextInput
        style={[s.col, s.colNum, s.input, set.done && s.inputDone]}
        keyboardType="decimal-pad"
        placeholder={previous ? String(previous.weight) : '0'}
        placeholderTextColor={Colors.textFaint}
        value={weight}
        onChangeText={(t) => {
          setWeight(t);
          onChange({ weight: num(t) });
        }}
        selectTextOnFocus
      />
      <TextInput
        style={[s.col, s.colNum, s.input, set.done && s.inputDone]}
        keyboardType="numeric"
        placeholder={previous ? String(previous.reps) : '0'}
        placeholderTextColor={Colors.textFaint}
        value={reps}
        onChangeText={(t) => {
          setReps(t);
          onChange({ reps: Math.round(num(t)) });
        }}
        selectTextOnFocus
      />
      <Pressable
        onPress={() => {
          // Ticking an empty set uses the placeholder (last time's) values.
          if (!set.done && set.reps === 0 && previous) {
            setWeight(weight || String(previous.weight));
            setReps(String(previous.reps));
            onChange({ reps: previous.reps, weight: set.weight || previous.weight });
          }
          onToggle();
        }}
        style={[s.colCheck, s.check, set.done && s.checkDone]}
        hitSlop={6}>
        <Ionicons name="checkmark" size={18} color={set.done ? Colors.background : Colors.textFaint} />
      </Pressable>
      <Pressable onPress={onRemove} style={s.colX} hitSlop={8}>
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
});
