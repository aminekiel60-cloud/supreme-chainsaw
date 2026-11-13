/** Shareable "my week" card: the stats you picked, a bar per day and the Locked in logo. */
import type { ComponentRef, RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { WeekReview } from '@/store/review';
import { LogoMark } from './Logo';

export type ReviewStyle = 'dark' | 'sticker';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ReviewCard({
  review,
  statIds,
  style,
  name,
  cardRef,
}: {
  review: WeekReview;
  statIds: string[];
  style: ReviewStyle;
  name?: string;
  cardRef: RefObject<ComponentRef<typeof View> | null>;
}) {
  const stats = review.stats.filter((x) => statIds.includes(x.id)).slice(0, 6);
  const maxMinutes = Math.max(30, ...review.days.map((d) => d.minutes));

  return (
    <View ref={cardRef} collapsable={false} style={[s.frame, style === 'dark' && s.dark]}>
      <View style={s.top}>
        <View>
          <Text style={s.kicker}>{name ? `${name.toUpperCase()}'S WEEK` : 'MY WEEK'}</Text>
          <Text style={s.range}>{review.label}</Text>
        </View>
        <LogoMark size={34} />
      </View>

      <View style={s.grid}>
        {stats.map((st) => (
          <View key={st.id} style={s.cell}>
            <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit>
              {st.value}
            </Text>
            <Text style={s.label}>{st.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.bars}>
        {review.days.map((d, i) => (
          <View key={d.date} style={s.barCol}>
            <View style={s.barTrack}>
              <View style={[s.barFill, { height: `${Math.round((d.minutes / maxMinutes) * 100)}%` }, d.minutes === 0 && { height: 3, backgroundColor: 'rgba(255,255,255,0.25)' }]} />
            </View>
            <Text style={[s.day, d.locked && { color: Colors.lime }]}>{LETTERS[i]}</Text>
          </View>
        ))}
      </View>

      <Text style={s.brand}>
        Locked <Text style={{ color: Colors.lime }}>in</Text> · LOCK IN. LEVEL UP.
      </Text>
    </View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 6 } as const;

const s = StyleSheet.create({
  frame: { width: 300, height: 420, borderRadius: 24, padding: 20, gap: 14, backgroundColor: 'transparent', overflow: 'hidden' },
  dark: { backgroundColor: '#111111', borderWidth: 2, borderColor: Colors.limeBorder },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: Colors.lime, fontWeight: '900', letterSpacing: 2, fontSize: 12, ...shadow },
  range: { color: '#FFFFFF', fontWeight: '900', fontSize: 22, ...shadow },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  cell: { width: '50%' },
  value: { color: '#FFFFFF', fontWeight: '900', fontSize: 24, ...shadow },
  label: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', ...shadow },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 60 },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6, backgroundColor: Colors.lime, minHeight: 3 },
  day: { color: 'rgba(255,255,255,0.8)', fontWeight: '800', fontSize: 11, ...shadow },
  brand: { color: '#FFFFFF', fontWeight: '800', fontSize: 11, letterSpacing: 1, textAlign: 'center', ...shadow },
});
