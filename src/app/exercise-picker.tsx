/** EXERCISES: search the library and your own exercises. Add one to a workout or routine, or open it to see how it's done. */
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { exerciseGuide } from '@/data/exerciseGuide';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '@/data/exercises';
import { haptics } from '@/lib/haptics';
import { setDraftPick, type PickerTarget } from '@/lib/workouts';
import { allExercises, exerciseHistory } from '@/store/exercises';
import { useStore } from '@/store/store';
import type { Exercise, MuscleGroup } from '@/store/types';

export default function ExercisePickerScreen() {
  const { target = 'active', routineId } = useLocalSearchParams<{ target?: PickerTarget | 'browse'; routineId?: string }>();
  const browse = target === 'browse';
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('chest');

  const all = useMemo(() => allExercises(state), [state]);
  const q = query.trim().toLowerCase();
  const list = all
    .filter((e) => (!muscle || e.muscle === muscle) && (!q || e.name.toLowerCase().includes(q)))
    .sort((a, b) => (b.lastDate ?? '').localeCompare(a.lastDate ?? '') || b.times - a.times || a.name.localeCompare(b.name));
  const exact = all.some((e) => e.name.toLowerCase() === q);

  const pick = (name: string) => {
    haptics.tap();
    if (browse) {
      router.push({ pathname: '/exercise/[name]', params: { name } });
      return;
    }
    if (target === 'active' && state.activeWorkout) {
      // Prefill with last time's sets, so you only have to tick them off.
      const last = exerciseHistory(state, name)[0];
      const sets = last ? last.sets.map((s) => ({ reps: s.reps, weight: s.weight, warmup: s.warmup, done: false })) : [{ reps: 0, weight: 0, done: false }];
      const exercise: Exercise = { name, sets };
      dispatch({ type: 'setActiveWorkout', workout: { ...state.activeWorkout, exercises: [...state.activeWorkout.exercises, exercise] } });
    } else if (target === 'routine' && routineId) {
      const routine = state.routines.find((r) => r.id === routineId);
      if (routine) dispatch({ type: 'updateRoutine', id: routineId, changes: { exercises: [...routine.exercises, { name, sets: 3 }] } });
    } else {
      setDraftPick(name);
    }
    router.back();
  };

  const create = () => {
    const name = query.trim();
    dispatch({ type: 'addCustomExercise', exercise: { name, muscle: newMuscle } });
    pick(name);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
        <View style={s.search}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={{ flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 10 }}
            placeholder="Search exercises"
            placeholderTextColor={Colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoFocus={!browse}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...MUSCLE_GROUPS]}
          keyExtractor={(m) => m ?? 'all'}
          contentContainerStyle={{ gap: Spacing.sm }}
          renderItem={({ item }) => (
            <Chip label={item ? MUSCLE_LABELS[item] : 'All'} active={muscle === item} onPress={() => setMuscle(item)} />
          )}
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(e) => e.name}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 48, gap: 6 }}
        ListHeaderComponent={
          q.length > 1 && !exact ? (
            <View style={s.create}>
              <Text style={[ui.text, { fontWeight: '700' }]}>Create &quot;{query.trim()}&quot;</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {MUSCLE_GROUPS.map((m) => (
                  <Chip key={m} label={MUSCLE_LABELS[m]} active={newMuscle === m} onPress={() => setNewMuscle(m)} />
                ))}
              </View>
              <Button title={browse ? 'Create exercise' : 'Create and add'} icon="add" onPress={create} />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => pick(item.name)} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[ui.text, { fontWeight: '700' }]}>{item.name}</Text>
              <Text style={ui.muted}>
                {MUSCLE_LABELS[item.muscle]}
                {item.times ? `. Done ${item.times === 1 ? 'once' : `${item.times} times`}` : ''}
              </Text>
            </View>
            {!browse && exerciseGuide(item.name) && (
              <Pressable hitSlop={8} onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: item.name } })} accessibilityLabel={`How to do ${item.name}`}>
                <Ionicons name="information-circle-outline" size={24} color={Colors.textMuted} />
              </Pressable>
            )}
            <Ionicons name={browse ? 'chevron-forward' : 'add-circle'} size={browse ? 20 : 26} color={browse ? Colors.textFaint : Colors.lime} />
          </Pressable>
        )}
        ListEmptyComponent={q.length <= 1 ? <Text style={[ui.muted, { textAlign: 'center' }]}>No exercises here.</Text> : undefined}
      />
    </View>
  );
}

const s = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  create: { gap: Spacing.sm, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.limeSoft, borderWidth: 1, borderColor: Colors.limeBorder, marginBottom: 6 },
});
