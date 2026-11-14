/** PERSONAL RECORDS: your best lift for every exercise you've done, strongest first. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Pill, StackPage } from '@/components/layout';
import { Card, Chip, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/data/exercises';
import { prettyDate } from '@/store/dates';
import { allExercises, exerciseRecords } from '@/store/exercises';
import { useUnits } from '@/lib/units';
import { useStore } from '@/store/store';

type Sort = 'strength' | 'recent';

export default function RecordsScreen() {
  const { state } = useStore();
  const units = useUnits();
  const [sort, setSort] = useState<Sort>('strength');
  const rows = allExercises(state)
    .filter((e) => e.times > 0)
    .map((e) => ({ ...e, records: exerciseRecords(state, e.name) }))
    .filter((e) => e.records.bestWeight && e.records.bestWeight.weight > 0)
    .sort((a, b) =>
      sort === 'strength'
        ? b.records.bestWeight!.weight - a.records.bestWeight!.weight || b.records.bestWeight!.reps - a.records.bestWeight!.reps
        : (b.records.bestWeight!.date > a.records.bestWeight!.date ? 1 : -1),
    );

  return (
    <StackPage>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Chip label="Heaviest" active={sort === 'strength'} onPress={() => setSort('strength')} />
        <Chip label="Newest" active={sort === 'recent'} onPress={() => setSort('recent')} />
      </View>
      {rows.length === 0 && (
        <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: 32 }}>
          <Ionicons name="trophy" size={40} color={Colors.textFaint} />
          <Text style={[ui.muted, { textAlign: 'center' }]}>Log a gym workout with weights and your records appear here.</Text>
        </Card>
      )}
      {rows.map((e) => {
        const best = e.records.bestWeight!;
        return (
          <Pressable key={e.name} onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: e.name } })}>
            <Card style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[ui.text, { fontWeight: '800' }]}>{e.name}</Text>
                  <Text style={ui.muted}>
                    {MUSCLE_LABELS[e.muscle]}. Set on {prettyDate(best.date)}.
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: Colors.lime, fontSize: 22, fontWeight: '900' }}>{units.text(best.weight)}</Text>
                  <Text style={ui.muted}>for {best.reps} {best.reps === 1 ? 'rep' : 'reps'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {e.records.bestVolume && <Pill icon="layers" text={`Best session ${units.show(e.records.bestVolume.value).toLocaleString('en-US')} ${units.unit}`} />}
                <Pill icon="repeat" text={`${e.records.sessions} ${e.records.sessions === 1 ? 'session' : 'sessions'}`} />
              </View>
            </Card>
          </Pressable>
        );
      })}
    </StackPage>
  );
}
