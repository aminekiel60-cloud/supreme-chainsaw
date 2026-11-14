/** LOG WORKOUT — gym (exercises, sets, reps, kg), run, walk, cycle, swim or any sport, with photo and friends. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { TagFriends } from '@/components/TagFriends';
import { Button, Card, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { keepPhoto, pickPhoto } from '@/lib/photos';
import { cloudEnabled } from '@/lib/supabase';
import { takeDraftPick } from '@/lib/workouts';
import { todayKey } from '@/store/dates';
import { detectRecords } from '@/store/exercises';
import { SPORTS, newId, sport } from '@/store/logic';
import { useStore } from '@/store/store';
import type { WorkoutType } from '@/store/types';

type DraftSet = { reps: string; weight: string };
type DraftExercise = { name: string; sets: DraftSet[] };

const num = (v: string) => Number(v.replace(',', '.')) || 0;

const PLACEHOLDERS: Record<WorkoutType, string> = {
  gym: 'e.g. Push day',
  run: 'e.g. Easy 5K',
  walk: 'e.g. Evening walk',
  cycle: 'e.g. Sunday ride',
  swim: 'e.g. Pool laps',
  other: 'e.g. Padel',
};

export default function LogWorkoutScreen() {
  const { state, dispatch } = useStore();
  // With ?id=… this screen edits an existing workout.
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const existing = state.workouts.find((w) => w.id === editId);
  const [type, setType] = useState<WorkoutType>(existing?.type ?? 'gym');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [duration, setDuration] = useState(existing ? String(existing.durationMin) : '');
  const [distance, setDistance] = useState(
    existing?.distanceKm ? String(existing.type === 'swim' ? Math.round(existing.distanceKm * 1000) : existing.distanceKm) : '',
  );
  const [photo, setPhoto] = useState<string | null>(existing?.photoUri ?? null);
  const [tagged, setTagged] = useState<{ id: string; name: string }[]>(existing?.tagged ?? []);
  const [exercises, setExercises] = useState<DraftExercise[]>(
    existing?.exercises?.length
      ? existing.exercises.map((e) => ({ name: e.name, sets: e.sets.map((x) => ({ reps: String(x.reps), weight: String(x.weight) })) }))
      : [{ name: '', sets: [{ reps: '', weight: '' }] }],
  );
  const info = sport(type);
  const swim = type === 'swim';

  /** Your sets for this exercise the last time you did it (case-insensitive name match). */
  const lastTime = (name: string) => {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    const previous = [...state.workouts]
      .filter((w) => w.id !== existing?.id && w.exercises?.some((e) => e.name.toLowerCase() === key))
      .sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    return previous?.exercises?.find((e) => e.name.toLowerCase() === key)?.sets ?? null;
  };

  // An exercise picked from the library lands in the first empty row (or a new one).
  useFocusEffect(
    useCallback(() => {
      const picked = takeDraftPick();
      if (!picked) return;
      setExercises((list) => {
        const empty = list.findIndex((e) => !e.name.trim());
        if (empty >= 0) return list.map((e, i) => (i === empty ? { ...e, name: picked } : e));
        return [...list, { name: picked, sets: [{ reps: '', weight: '' }] }];
      });
    }, []),
  );

  const removeSet = (i: number, j: number) =>
    updateExercise(i, { sets: exercises[i].sets.length > 1 ? exercises[i].sets.filter((_, idx) => idx !== j) : [{ reps: '', weight: '' }] });
  const removeExercise = (i: number) => setExercises((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : [{ name: '', sets: [{ reps: '', weight: '' }] }]));

  const updateExercise = (i: number, change: Partial<DraftExercise>) =>
    setExercises((list) => list.map((e, idx) => (idx === i ? { ...e, ...change } : e)));

  const updateSet = (i: number, j: number, change: Partial<DraftSet>) =>
    updateExercise(i, { sets: exercises[i].sets.map((s, idx) => (idx === j ? { ...s, ...change } : s)) });

  const addPhoto = () => {
    const run = async (source: 'camera' | 'library') => {
      const uri = await pickPhoto(source);
      if (uri) setPhoto(uri);
    };
    Alert.alert('Workout photo', undefined, [
      { text: 'Take photo', onPress: () => run('camera') },
      { text: 'Choose from gallery', onPress: () => run('library') },
      ...(photo ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => setPhoto(null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const save = async () => {
    const id = existing?.id ?? newId();
    const kept = photo ? (photo === existing?.photoUri ? photo : await keepPhoto(photo, `workout-${id}-${Date.now()}`)) : undefined;
    const d = num(distance);
    const workout = {
      id,
      date: existing?.date ?? todayKey(),
      type,
      title: title.trim() || info.title,
      durationMin: num(duration),
      distanceKm: info.distance && d ? (swim ? d / 1000 : d) : undefined,
      photoUri: kept,
      tagged: tagged.length ? tagged : undefined,
      exercises:
        type === 'gym'
          ? exercises
              .filter((e) => e.name.trim())
              .map((e) => ({
                name: e.name.trim(),
                sets: e.sets.filter((s) => num(s.reps) > 0).map((s) => ({ reps: num(s.reps), weight: num(s.weight) })),
              }))
          : undefined,
    };
    if (existing) {
      dispatch({ type: 'updateWorkout', id, changes: workout });
      router.back();
      return;
    }
    dispatch({ type: 'addWorkout', workout: { ...workout, prs: detectRecords(state, { ...workout, id }) } });
    // Straight to the summary, so you can share it.
    router.replace({ pathname: '/workout/[id]', params: { id, fresh: '1' } });
  };

  return (
    <FormScroll>
      <View style={s.sports}>
        {SPORTS.map((sp) => (
          <Pressable key={sp.id} onPress={() => setType(sp.id)} style={[s.sport, type === sp.id && s.sportActive]}>
            <Ionicons name={sp.icon} size={22} color={type === sp.id ? Colors.background : Colors.lime} />
            <Text style={[s.sportLabel, type === sp.id && { color: Colors.background }]}>{sp.label}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ gap: Spacing.md }}>
        <Field label="Title" placeholder={PLACEHOLDERS[type]} value={title} onChangeText={setTitle} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="Duration (min)" keyboardType="numeric" placeholder="0" value={duration} onChangeText={setDuration} />
          {info.distance && (
            <Field
              label={swim ? 'Distance (m)' : 'Distance (km)'}
              keyboardType="decimal-pad"
              placeholder="0"
              value={distance}
              onChangeText={setDistance}
            />
          )}
        </View>
      </Card>

      {type === 'gym' && (
        <>
          <SectionTitle>Exercises</SectionTitle>
          {exercises.map((ex, i) => (
            <Card key={i} style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm }}>
                <Field
                  label={`Exercise ${i + 1}`}
                  placeholder="e.g. Bench press"
                  value={ex.name}
                  onChangeText={(name) => updateExercise(i, { name })}
                />
                <Pressable
                  hitSlop={8}
                  style={{ paddingBottom: 12 }}
                  onPress={() => router.push({ pathname: '/exercise-picker', params: { target: 'draft' } })}
                  accessibilityLabel="Pick from library">
                  <Ionicons name="search" size={22} color={Colors.lime} />
                </Pressable>
                <Pressable hitSlop={8} style={{ paddingBottom: 12 }} onPress={() => removeExercise(i)} accessibilityLabel="Remove exercise">
                  <Ionicons name="trash-outline" size={22} color={Colors.textMuted} />
                </Pressable>
              </View>
              {lastTime(ex.name) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text style={[ui.muted, { color: Colors.lime, flex: 1 }]}>
                    Last time: {lastTime(ex.name)!.map((x) => `${x.reps}×${x.weight}kg`).join(', ')}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      updateExercise(i, { sets: lastTime(ex.name)!.map((x) => ({ reps: String(x.reps), weight: String(x.weight) })) })
                    }>
                    <Text style={{ color: Colors.lime, fontWeight: '800' }}>Use last time</Text>
                  </Pressable>
                </View>
              )}
              {ex.sets.map((set, j) => (
                <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text numberOfLines={1} style={[ui.muted, { width: 48 }]}>
                    Set {j + 1}
                  </Text>
                  <TextInput
                    style={[ui.input, { flex: 1, minWidth: 0 }]}
                    keyboardType="numeric"
                    placeholder={String(lastTime(ex.name)?.[j]?.reps ?? 'reps')}
                    placeholderTextColor={Colors.textFaint}
                    value={set.reps}
                    onChangeText={(reps) => updateSet(i, j, { reps })}
                  />
                  <Text style={ui.muted}>×</Text>
                  <TextInput
                    style={[ui.input, { flex: 1, minWidth: 0 }]}
                    keyboardType="decimal-pad"
                    placeholder={lastTime(ex.name)?.[j] ? String(lastTime(ex.name)![j].weight) : 'kg'}
                    placeholderTextColor={Colors.textFaint}
                    value={set.weight}
                    onChangeText={(weight) => updateSet(i, j, { weight })}
                  />
                  <Pressable hitSlop={8} onPress={() => removeSet(i, j)} accessibilityLabel="Remove set">
                    <Ionicons name="close" size={18} color={Colors.textFaint} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
                onPress={() => updateExercise(i, { sets: [...ex.sets, { ...ex.sets[ex.sets.length - 1] }] })}>
                <Ionicons name="add" size={18} color={Colors.lime} />
                <Text style={{ color: Colors.lime, fontWeight: '700' }}>Add set</Text>
              </Pressable>
            </Card>
          ))}
          <Button
            title="Add exercise"
            icon="add"
            variant="ghost"
            onPress={() => setExercises([...exercises, { name: '', sets: [{ reps: '', weight: '' }] }])}
          />
        </>
      )}

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Photo</SectionTitle>
        <Pressable onPress={addPhoto} style={s.photo}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Ionicons name="camera" size={28} color={Colors.lime} />
              <Text style={ui.muted}>Add a photo{cloudEnabled ? '. Friends see it in the feed.' : ''}</Text>
            </View>
          )}
        </Pressable>
      </Card>

      {cloudEnabled && (
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle>Trained with</SectionTitle>
          <TagFriends value={tagged} onChange={setTagged} />
        </Card>
      )}

      <Button title={existing ? 'Save changes' : 'Save workout'} icon="checkmark" disabled={!num(duration)} onPress={save} />
    </FormScroll>
  );
}

const s = StyleSheet.create({
  sports: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  sport: {
    width: '31.8%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  sportActive: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  sportLabel: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  photo: {
    height: 170,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.limeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
