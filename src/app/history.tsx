/** ALL WORKOUTS: every workout you logged, newest first, grouped by month. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Section, StackPage } from '@/components/layout';
import { WorkoutRow } from '@/components/WorkoutRow';
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { fromKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { Workout } from '@/store/types';

export default function HistoryScreen() {
  const { state } = useStore();
  const sorted = [...state.workouts].reverse().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const months: { label: string; items: Workout[] }[] = [];
  for (const w of sorted) {
    const label = fromKey(w.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const last = months[months.length - 1];
    if (last?.label === label) last.items.push(w);
    else months.push({ label, items: [w] });
  }

  if (sorted.length === 0) {
    return (
      <StackPage>
        <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: 32 }}>
          <Ionicons name="barbell" size={40} color={Colors.textFaint} />
          <Text style={[ui.muted, { textAlign: 'center' }]}>No workouts yet.</Text>
          <Button title="Log a workout" icon="add" onPress={() => router.push('/log-workout')} />
        </Card>
      </StackPage>
    );
  }

  return (
    <StackPage>
      {months.map((m) => (
        <View key={m.label} style={{ gap: Spacing.sm }}>
          <Section title={`${m.label} (${m.items.length})`} />
          {m.items.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </View>
      ))}
    </StackPage>
  );
}
