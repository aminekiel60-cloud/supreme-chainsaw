/** ROUTINES — your saved workout plans. Start one, edit it, or create a new one. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Card, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { startWorkout } from '@/lib/workouts';
import { prettyDate } from '@/store/dates';
import { useStore } from '@/store/store';
import type { Routine } from '@/store/types';

export default function RoutinesScreen() {
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const create = () => {
    const name = newName.trim() || `Routine ${state.routines.length + 1}`;
    dispatch({ type: 'addRoutine', routine: { name, exercises: [] } });
    setNewName('');
  };

  const start = (r: Routine) => {
    if (state.activeWorkout) {
      Alert.alert('Workout in progress', 'Finish or discard it first.', [{ text: 'Open it', onPress: () => router.push('/active-workout') }, { text: 'OK' }]);
      return;
    }
    startWorkout(state, dispatch, r);
    router.push('/active-workout');
  };

  const remove = (r: Routine) =>
    Alert.alert('Delete routine?', r.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'removeRoutine', id: r.id }) },
    ]);

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>New routine</SectionTitle>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput
            style={[ui.input, { flex: 1 }]}
            placeholder="e.g. Push day"
            placeholderTextColor={Colors.textFaint}
            value={newName}
            onChangeText={setNewName}
          />
          <Pressable onPress={create} style={{ backgroundColor: Colors.lime, borderRadius: 999, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: Colors.background, fontWeight: '800' }}>Create</Text>
          </Pressable>
        </View>
        <Text style={ui.muted}>Tip: after a workout, tap “Save as routine” on its summary to reuse it.</Text>
      </Card>

      {state.routines.length === 0 && (
        <Card>
          <Text style={ui.muted}>No routines yet. A routine is a list of exercises you can start in one tap. It remembers your sets.</Text>
        </Card>
      )}

      {state.routines.map((r) => (
        <Card key={r.id} style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            {editing === r.id ? (
              <TextInput
                style={[ui.input, { flex: 1 }]}
                value={r.name}
                autoFocus
                onChangeText={(name) => dispatch({ type: 'updateRoutine', id: r.id, changes: { name } })}
                onBlur={() => setEditing(null)}
              />
            ) : (
              <Pressable style={{ flex: 1 }} onLongPress={() => setEditing(r.id)}>
                <Text style={[ui.text, { fontWeight: '800', fontSize: 17 }]}>{r.name}</Text>
                <Text style={ui.muted}>
                  {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'}
                  {r.lastUsed ? `. Last done ${prettyDate(r.lastUsed)}` : ''}
                </Text>
              </Pressable>
            )}
            <Pressable hitSlop={8} onPress={() => remove(r)}>
              <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          {r.exercises.map((e, i) => (
            <View key={`${e.name}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Text style={[ui.text, { flex: 1 }]}>{e.name}</Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  dispatch({
                    type: 'updateRoutine',
                    id: r.id,
                    changes: { exercises: r.exercises.map((x, j) => (j === i ? { ...x, sets: Math.max(1, x.sets - 1) } : x)) },
                  })
                }>
                <Ionicons name="remove-circle-outline" size={20} color={Colors.textMuted} />
              </Pressable>
              <Text style={[ui.muted, { width: 46, textAlign: 'center' }]}>{e.sets} sets</Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  dispatch({ type: 'updateRoutine', id: r.id, changes: { exercises: r.exercises.map((x, j) => (j === i ? { ...x, sets: x.sets + 1 } : x)) } })
                }>
                <Ionicons name="add-circle-outline" size={20} color={Colors.textMuted} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => dispatch({ type: 'updateRoutine', id: r.id, changes: { exercises: r.exercises.filter((_, j) => j !== i) } })}>
                <Ionicons name="close" size={18} color={Colors.textFaint} />
              </Pressable>
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Add exercise" icon="add" variant="ghost" onPress={() => router.push({ pathname: '/exercise-picker', params: { target: 'routine', routineId: r.id } })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Start" icon="play" onPress={() => start(r)} disabled={r.exercises.length === 0} />
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
