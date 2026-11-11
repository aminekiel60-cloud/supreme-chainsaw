/** Your level, title and XP bar. */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';
import { CountUp } from './motion';
import { Card, ProgressBar, styles as ui } from './ui';

export function LevelCard({ compact }: { compact?: boolean }) {
  const { state } = useStore();
  const info = levelInfo(totalXp(state));

  return (
    <Card highlight style={{ gap: Spacing.sm, padding: compact ? 14 : 16 }}>
      <View style={s.row}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{info.level}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ui.statLabel}>LEVEL {info.level}</Text>
          <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '800' }}>{info.title}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="flash" size={14} color={Colors.lime} />
            <CountUp value={info.xp} style={{ color: Colors.lime, fontWeight: '800' }} format={(n) => `${n.toLocaleString('en-US')} XP`} />
          </View>
          <Text style={ui.muted}>
            {info.needed - info.intoLevel} XP to level {info.level + 1}
          </Text>
        </View>
      </View>
      <ProgressBar progress={info.progress} />
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  badgeText: { color: Colors.background, fontWeight: '900', fontSize: 18, transform: [{ rotate: '-45deg' }] },
});
