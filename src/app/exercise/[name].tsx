/** EXERCISE — your records, progress chart and history for one exercise. */
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { LineChart } from '@/components/LineChart';
import { Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/data/exercises';
import { prettyDate } from '@/store/dates';
import { exerciseHistory, exerciseRecords, muscleOf, oneRepMax, suggestNext } from '@/store/exercises';
import { useStore } from '@/store/store';

type Metric = '1rm' | 'weight' | 'volume';

export default function ExerciseScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { state } = useStore();
  const [metric, setMetric] = useState<Metric>('1rm');
  const history = exerciseHistory(state, name);
  const records = exerciseRecords(state, name);
  const suggestion = suggestNext(state, name);
  const muscle = muscleOf(state, name);

  const points = [...history].reverse().map((h) => {
    const sets = h.sets.filter((x) => !x.warmup && x.reps > 0);
    const value =
      metric === '1rm'
        ? Math.max(0, ...sets.map(oneRepMax))
        : metric === 'weight'
          ? Math.max(0, ...sets.map((x) => x.weight))
          : sets.reduce((t, x) => t + x.reps * x.weight, 0);
    return { label: h.date.slice(5).split('-').reverse().join('/'), value: Math.round(value * 10) / 10 };
  });

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: name }} />
      {muscle && <Text style={ui.muted}>{MUSCLE_LABELS[muscle]} · {records.sessions} sessions</Text>}

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Record label="Best weight" value={records.bestWeight ? `${records.bestWeight.weight} kg` : '—'} sub={records.bestWeight ? `× ${records.bestWeight.reps}` : ''} />
        <Record label="Est. 1RM" value={records.best1RM ? `${records.best1RM.value} kg` : '—'} sub={records.best1RM ? `${records.best1RM.weight} × ${records.best1RM.reps}` : ''} />
        <Record label="Best volume" value={records.bestVolume ? `${records.bestVolume.value.toLocaleString('en-US')}` : '—'} sub={records.bestVolume ? 'kg in a session' : ''} />
      </View>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Progress</SectionTitle>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="Est. 1RM" active={metric === '1rm'} onPress={() => setMetric('1rm')} />
          <Chip label="Top weight" active={metric === 'weight'} onPress={() => setMetric('weight')} />
          <Chip label="Volume" active={metric === 'volume'} onPress={() => setMetric('volume')} />
        </View>
        <LineChart points={points.slice(-20)} unit=" kg" />
        {suggestion && <Text style={{ color: Colors.lime, fontWeight: '600' }}>💡 Next time: {suggestion.hint}</Text>}
      </Card>

      <SectionTitle>History</SectionTitle>
      {history.length === 0 && (
        <Card>
          <Text style={ui.muted}>You haven&apos;t logged this exercise yet.</Text>
        </Card>
      )}
      {history.map((h) => {
        const w = state.workouts.find((x) => x.id === h.workoutId);
        return (
          <Card key={h.workoutId} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[ui.text, { fontWeight: '700' }]}>{prettyDate(h.date)}</Text>
              {w && (
                <Text onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })} style={{ color: Colors.lime, fontWeight: '700' }}>
                  {w.title} ›
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {h.sets.map((x, i) => (
                <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: x.warmup ? Colors.cardRaised : Colors.limeSoft }}>
                  <Text style={{ color: x.warmup ? Colors.textMuted : Colors.text, fontWeight: '700', fontSize: 12 }}>
                    {x.weight} × {x.reps}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}
      {history.length > 0 && (
        <Text style={[ui.muted, { textAlign: 'center' }]}>
          <Ionicons name="information-circle-outline" size={12} /> Est. 1RM uses the Epley formula: weight × (1 + reps ÷ 30)
        </Text>
      )}
    </ScrollView>
  );
}

function Record({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, gap: 2 }}>
      <Text style={ui.statLabel}>{label}</Text>
      <Text style={{ color: Colors.lime, fontSize: 18, fontWeight: '900' }}>{value}</Text>
      <Text style={ui.muted}>{sub}</Text>
    </Card>
  );
}
