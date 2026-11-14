/** EXERCISE: how to do it, your records, progress chart and history for one exercise. */
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ExerciseDemo } from '@/components/ExerciseDemo';
import { LineChart } from '@/components/LineChart';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { MUSCLE_GROUPS, MUSCLE_LABELS, libraryExercise } from '@/data/exercises';
import { prettyDate } from '@/store/dates';
import { closestExercise, exerciseHistory, exerciseRecords, muscleOf, renameExercise, suggestNext } from '@/store/exercises';
import { useUnits } from '@/lib/units';
import { useStore } from '@/store/store';

type Metric = 'weight' | 'reps' | 'volume';

export default function ExerciseScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { state, dispatch } = useStore();
  const units = useUnits();
  const [metric, setMetric] = useState<Metric>('weight');
  const history = exerciseHistory(state, name);
  const records = exerciseRecords(state, name);
  const suggestion = suggestNext(state, name);
  const muscle = muscleOf(state, name);
  const inLibrary = Boolean(libraryExercise(name));
  const suggestedName = closestExercise(name);
  // Your rep records: the most reps you did at each weight, heaviest first.
  const repRecords = new Map<number, number>();
  for (const h of history) for (const x of h.sets) if (!x.warmup && x.weight > 0 && x.reps > (repRecords.get(x.weight) ?? 0)) repRecords.set(x.weight, x.reps);
  const repList = [...repRecords.entries()].sort((a, b) => b[0] - a[0]).slice(0, 8);
  const mostReps = repList.reduce<{ weight: number; reps: number } | null>((m, [weight, reps]) => (!m || reps > m.reps ? { weight, reps } : m), null);

  const points = [...history].reverse().map((h) => {
    const sets = h.sets.filter((x) => !x.warmup && x.reps > 0);
    const top = Math.max(0, ...sets.map((x) => x.weight));
    const value =
      metric === 'weight'
        ? top
        : metric === 'reps'
          ? Math.max(0, ...sets.filter((x) => x.weight === top).map((x) => x.reps))
          : sets.reduce((t, x) => t + x.reps * x.weight, 0);
    return { label: h.date.slice(5).split('-').reverse().join('/'), value: Math.round(value * 10) / 10 };
  });

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: name }} />
      {suggestedName && (
        <Card highlight style={{ gap: Spacing.sm }}>
          <Text style={[ui.text, { fontWeight: '800' }]}>Did you mean {suggestedName}?</Text>
          <Text style={ui.muted}>Merge them and all your sets of {name} count for {suggestedName}, with its photos and records.</Text>
          <Button
            title={`Yes, merge into ${suggestedName}`}
            icon="git-merge-outline"
            onPress={() => {
              dispatch({ type: 'apply', change: (s) => renameExercise(s, name, suggestedName) });
              router.replace({ pathname: '/exercise/[name]', params: { name: suggestedName } });
            }}
          />
        </Card>
      )}

      {!inLibrary && (
        <Card style={{ gap: Spacing.sm }}>
          <Text style={[ui.text, { fontWeight: '800' }]}>Which muscle does it train?</Text>
          <Text style={ui.muted}>So it counts in Muscles this week.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {MUSCLE_GROUPS.map((m) => (
              <Chip
                key={m}
                label={MUSCLE_LABELS[m]}
                active={muscle === m}
                onPress={() =>
                  dispatch({
                    type: 'apply',
                    change: (s) => ({
                      customExercises: [...s.customExercises.filter((e) => e.name.toLowerCase() !== name.toLowerCase()), { name, muscle: m }],
                    }),
                  })
                }
              />
            ))}
          </View>
        </Card>
      )}

      {muscle && (
        <Text style={ui.muted}>
          {MUSCLE_LABELS[muscle]}. {records.sessions === 1 ? 'Done once' : records.sessions ? `Done ${records.sessions} times` : 'Not done yet'}.
        </Text>
      )}
      <ExerciseDemo name={name} />

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Record label="Best weight" value={records.bestWeight ? units.text(records.bestWeight.weight) : 'None'} sub={records.bestWeight ? `for ${records.bestWeight.reps} reps` : ''} />
        <Record label="Most reps" value={mostReps ? `${mostReps.reps}` : 'None'} sub={mostReps ? `at ${units.text(mostReps.weight)}` : ''} />
        <Record label="Best volume" value={records.bestVolume ? `${units.show(records.bestVolume.value).toLocaleString('en-US')}` : 'None'} sub={records.bestVolume ? `${units.unit} in a session` : ''} />
      </View>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Progress</SectionTitle>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="Top weight" active={metric === 'weight'} onPress={() => setMetric('weight')} />
          <Chip label="Reps at top" active={metric === 'reps'} onPress={() => setMetric('reps')} />
          <Chip label="Volume" active={metric === 'volume'} onPress={() => setMetric('volume')} />
        </View>
        <LineChart points={points.slice(-20).map((x) => (metric === 'reps' ? x : { ...x, value: units.show(x.value) }))} unit={metric === 'reps' ? ' reps' : ` ${units.unit}`} />
        {suggestion && <Text style={{ color: Colors.lime, fontWeight: '600' }}>Next time: {suggestion.hint}</Text>}
      </Card>

      {repList.length > 1 && (
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle>Rep records</SectionTitle>
          <Text style={ui.muted}>The most reps you did at each weight. Beat one and it counts as a PR.</Text>
          {repList.map(([kg, reps]) => (
            <View key={kg} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={ui.text}>{units.text(kg)}</Text>
              <Text style={{ color: Colors.text, fontWeight: '800' }}>
                {reps} {reps === 1 ? 'rep' : 'reps'}
              </Text>
            </View>
          ))}
        </Card>
      )}

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
                    {units.set(x)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}
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
