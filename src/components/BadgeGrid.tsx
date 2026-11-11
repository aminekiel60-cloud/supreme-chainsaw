/** Grid of badges: earned ones glow in their tier colour, others show progress. */
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { TIER_COLORS, type Badge } from '@/store/progress';

export function BadgeGrid({ items }: { items: Badge[] }) {
  return (
    <View style={s.grid}>
      {items.map((b) => {
        const color = TIER_COLORS[b.tier];
        return (
          <View key={b.id} style={[s.badge, b.earned && { borderColor: color, backgroundColor: `${color}14` }]}>
            <View style={[s.icon, { borderColor: b.earned ? color : Colors.border }]}>
              <Ionicons name={b.earned ? b.icon : 'lock-closed'} size={22} color={b.earned ? color : Colors.textFaint} />
            </View>
            <Text style={[s.title, !b.earned && { color: Colors.textMuted }]} numberOfLines={1}>
              {b.title}
            </Text>
            <Text style={s.detail} numberOfLines={2}>
              {b.detail}
            </Text>
            {!b.earned && (
              <View style={s.track}>
                <View style={[s.fill, { width: `${Math.round(b.progress * 100)}%` }]} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badge: {
    width: '31.5%',
    alignItems: 'center',
    gap: 4,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardRaised,
  },
  icon: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.text, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  detail: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  track: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden', marginTop: 2 },
  fill: { height: '100%', backgroundColor: Colors.lime },
});
