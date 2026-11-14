/** BADGES — all badges with your progress towards each. */
import { ScrollView, Text } from 'react-native';

import { BadgeGrid } from '@/components/BadgeGrid';
import { styles as ui } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { badges } from '@/store/progress';
import { useStore } from '@/store/store';

export default function BadgesScreen() {
  const { state } = useStore();
  const all = badges(state);
  const earned = all.filter((b) => b.earned).length;

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <Text style={ui.muted}>
        {earned} of {all.length} earned. Each badge has bronze, silver, gold and legend levels.
      </Text>
      <BadgeGrid items={[...all.filter((b) => b.earned), ...all.filter((b) => !b.earned)]} />
    </ScrollView>
  );
}
