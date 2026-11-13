/** Working sets per muscle group this week, so you can spot what you're skipping. */
import { Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/data/exercises';
import { muscleSetsThisWeek } from '@/store/exercises';
import { useStore } from '@/store/store';
import type { MuscleGroup } from '@/store/types';
import { Card, ProgressBar, SectionTitle, styles as ui } from './ui';

const SHOWN: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'core'];
/** Sets per week that count as "well trained" for the bar to be full. */
const TARGET = 12;

export function MuscleBalance() {
  const { state } = useStore();
  const sets = muscleSetsThisWeek(state);
  const total = SHOWN.reduce((t, m) => t + sets[m], 0);
  if (total === 0) return null;
  const least = [...SHOWN].sort((a, b) => sets[a] - sets[b])[0];

  return (
    <Card style={{ gap: Spacing.sm }}>
      <SectionTitle action={<Text style={ui.muted}>{total} working sets</Text>}>Muscles this week</SectionTitle>
      {SHOWN.map((m) => (
        <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={[ui.muted, { width: 86 }]}>{MUSCLE_LABELS[m]}</Text>
          <View style={{ flex: 1 }}>
            <ProgressBar progress={sets[m] / TARGET} color={sets[m] === 0 ? Colors.border : sets[m] < 6 ? Colors.fat : Colors.lime} />
          </View>
          <Text style={{ color: Colors.text, fontWeight: '700', width: 24, textAlign: 'right' }}>{sets[m]}</Text>
        </View>
      ))}
      <Text style={ui.muted}>
        {sets[least] === 0 ? `No ${MUSCLE_LABELS[least].toLowerCase()} yet this week.` : `Least trained: ${MUSCLE_LABELS[least].toLowerCase()}.`} Aim for 10 to 20 working sets per muscle each week.
      </Text>
    </Card>
  );
}
