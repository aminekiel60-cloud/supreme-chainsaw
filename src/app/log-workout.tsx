/** LOG WORKOUT — gym sessions (exercises, sets, reps, weight), runs and other sports. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { WorkoutType } from '@/store/types';

type DraftSet = { reps: string; weight: string };
type DraftExercise = { name: string; sets: DraftSet[] };

const TYPES: { id: WorkoutType; label: string; title: string }[] = [
  { id: 'gym', label: 'Gym', title: 'Gym session' },
  { id: 'run', label: 'Run', title: 'Run' },
  { id: 'other', label: 'Other sport', title: 'Workout' },
];

const num = (v: string) => Number(v.replace(',', '.')) || 0;

export default function LogWorkoutScreen() {
  const { dispatch } = useStore();
  const [type, setType] = useState<WorkoutType>('gym');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([
    { name: '', sets: [{ reps: '', weight: '' }] },
  ]);

  const updateExercise = (i: number, change: Partial<DraftExercise>) =>
    setExercises((list) => list.map((e, idx) => (idx === i ? { ...e, ...change } : e)));

  const updateSet = (i: number, j: number, change: Partial<DraftSet>) =>
    updateExercise(i, {
      sets: exercises[i].sets.map((s, idx) => (idx === j ? { ...s, ...change } : s)),
    });

  const save = () => {
    const fallback = TYPES.find((t) => t.id === type)!.title;
    dispatch({
      type: 'addWorkout',
      workout: {
        date: todayKey(),
        type,
        title: title.trim() || fallback,
        durationMin: num(duration),
        distanceKm: type === 'gym' ? undefined : num(distance) || undefined,
        exercises:
          type === 'gym'
            ? exercises
                .filter((e) => e.name.trim())
                .map((e) => ({
                  name: e.name.trim(),
                  sets: e.sets
                    .filter((s) => num(s.reps) > 0)
                    .map((s) => ({ reps: num(s.reps), weight: num(s.weight) })),
                }))
            : undefined,
      },
    });
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {TYPES.map((t) => (
          <Chip key={t.id} label={t.label} active={type === t.id} onPress={() => setType(t.id)} />
        ))}
      </View>

      <Card style={{ gap: Spacing.md }}>
        <Field
          label="Title"
          placeholder={type === 'gym' ? 'e.g. Push day' : type === 'run' ? 'e.g. Easy 5K' : 'e.g. Padel'}
          value={title}
          onChangeText={setTitle}
        />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="Duration (min)" keyboardType="numeric" placeholder="0" value={duration} onChangeText={setDuration} />
          {type !== 'gym' && (
            <Field label="Distance (km)" keyboardType="decimal-pad" placeholder="0" value={distance} onChangeText={setDistance} />
          )}
        </View>
      </Card>

      {type === 'gym' && (
        <>
          <SectionTitle>Exercises</SectionTitle>
          {exercises.map((ex, i) => (
            <Card key={i} style={{ gap: Spacing.sm }}>
              <Field
                label={`Exercise ${i + 1}`}
                placeholder="e.g. Bench press"
                value={ex.name}
                onChangeText={(name) => updateExercise(i, { name })}
              />
              {ex.sets.map((set, j) => (
                <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text numberOfLines={1} style={[ui.muted, { width: 48 }]}>Set {j + 1}</Text>
                  <TextInput
                    style={[ui.input, { flex: 1, minWidth: 0 }]}
                    keyboardType="numeric"
                    placeholder="reps"
                    placeholderTextColor={Colors.textFaint}
                    value={set.reps}
                    onChangeText={(reps) => updateSet(i, j, { reps })}
                  />
                  <Text style={ui.muted}>×</Text>
                  <TextInput
                    style={[ui.input, { flex: 1, minWidth: 0 }]}
                    keyboardType="decimal-pad"
                    placeholder="kg"
                    placeholderTextColor={Colors.textFaint}
                    value={set.weight}
                    onChangeText={(weight) => updateSet(i, j, { weight })}
                  />
                </View>
              ))}
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
                onPress={() => {
                  const last = ex.sets[ex.sets.length - 1];
                  updateExercise(i, { sets: [...ex.sets, { ...last }] });
                }}>
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

      <Button title="Save workout" icon="checkmark" disabled={!num(duration)} onPress={save} />
    </ScrollView>
  );
}
