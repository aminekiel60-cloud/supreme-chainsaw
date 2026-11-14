/** YEAR IN REVIEW: your year in numbers, as a card to share or save. */
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LogoMark } from '@/components/Logo';
import { saveCard, shareCard } from '@/components/ShareCard';
import { Button, Chip, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useUnits } from '@/lib/units';
import { useStore } from '@/store/store';
import { yearReview, yearsWithData } from '@/store/year';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function YearScreen() {
  const { state } = useStore();
  const units = useUnits();
  const years = yearsWithData(state);
  const [year, setYear] = useState(years[0]);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const r = yearReview(state, year);
  const top = Math.max(1, ...r.months);
  const tonnes = units.show(r.volume) / 1000;

  const run = async (action: 'share' | 'save') => {
    setBusy(true);
    try {
      if (action === 'share') await shareCard(cardRef);
      else {
        const ok = await saveCard(cardRef);
        Alert.alert(ok ? 'Saved to your gallery' : 'Permission needed', ok ? 'Find it in your Photos app.' : 'Allow Locked in to save photos and try again.');
      }
    } catch {
      Alert.alert(action === 'share' ? 'Sharing is not available on this device.' : 'Could not save the image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={s.page}>
      {years.length > 1 && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
          {years.map((y) => (
            <Chip key={y} label={String(y)} active={y === year} onPress={() => setYear(y)} />
          ))}
        </View>
      )}

      <View ref={cardRef} collapsable={false} style={s.card}>
        <Text style={s.kicker}>{(state.profile?.name ?? 'MY').toUpperCase()}&apos;S</Text>
        <Text style={s.year}>{year}</Text>
        <Text style={s.sub}>LOCKED IN, YEAR IN REVIEW</Text>

        <View style={s.grid}>
          <Big value={String(r.workouts)} label="workouts" />
          <Big value={String(r.hours)} label="hours trained" />
          <Big value={tonnes >= 1 ? `${tonnes.toFixed(tonnes >= 100 ? 0 : 1)}t` : `${units.show(r.volume)}`} label={tonnes >= 1 ? `lifted (${units.unit === 'lb' ? 'thousand lb' : 'tonnes'})` : `${units.unit} lifted`} />
          <Big value={String(r.prs)} label="personal records" />
          {r.km > 0 && <Big value={String(r.km)} label="km moved" />}
          <Big value={String(r.lockedDays)} label="locked-in days" />
          <Big value={String(r.longestStreak)} label="longest streak" />
          <Big value={String(r.sets)} label="sets" />
        </View>

        <View style={s.bars}>
          {r.months.map((n, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={s.barTrack}>
                <View style={[s.bar, { height: `${Math.round((n / top) * 100)}%` }]} />
              </View>
              <Text style={s.month}>{MONTHS[i]}</Text>
            </View>
          ))}
        </View>

        {(r.topExercise || r.topMuscle) && (
          <View style={{ gap: 4 }}>
            {r.topExercise && (
              <Text style={s.line}>
                Favourite: <Text style={s.lime}>{r.topExercise.name}</Text>, {r.topExercise.times} {r.topExercise.times === 1 ? 'session' : 'sessions'}
              </Text>
            )}
            {r.topMuscle && (
              <Text style={s.line}>
                Most trained: <Text style={s.lime}>{r.topMuscle}</Text>
              </Text>
            )}
          </View>
        )}
        {r.bestLifts.length > 0 && (
          <View style={{ gap: 2 }}>
            <Text style={s.kickerSmall}>BEST LIFTS</Text>
            {r.bestLifts.map(([name, kg]) => (
              <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.line}>{name}</Text>
                <Text style={[s.line, s.lime]}>{units.text(kg)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.brand}>
          <LogoMark size={22} />
          <Text style={s.brandText}>
            Locked <Text style={s.lime}>in</Text>
          </Text>
        </View>
      </View>

      {r.workouts === 0 && <Text style={[ui.muted, { textAlign: 'center' }]}>No workouts in {year} yet. Your recap fills up as you train.</Text>}

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Share" icon="share-social" onPress={() => run('share')} disabled={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Save image" icon="download" variant="ghost" onPress={() => run('save')} disabled={busy} />
        </View>
      </View>
    </ScrollView>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.big}>
      <Text style={s.bigValue}>{value}</Text>
      <Text style={s.bigLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 60 },
  card: { backgroundColor: '#0B0B0B', borderRadius: Radius.lg, padding: 22, gap: 18, borderWidth: 2, borderColor: Colors.lime },
  kicker: { color: Colors.lime, fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  kickerSmall: { color: Colors.textMuted, fontWeight: '900', letterSpacing: 1.5, fontSize: 11 },
  year: { color: Colors.text, fontSize: 64, fontWeight: '900', letterSpacing: -2, marginTop: -10, lineHeight: 70 },
  sub: { color: Colors.textMuted, fontWeight: '800', letterSpacing: 1.5, fontSize: 11, marginTop: -12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  big: { width: '50%' },
  bigValue: { color: Colors.text, fontSize: 30, fontWeight: '900' },
  bigLabel: { color: Colors.textMuted, fontWeight: '700', fontSize: 12 },
  bars: { flexDirection: 'row', gap: 4, height: 80 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: '#1a1a1a', borderRadius: 4, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: Colors.lime, borderRadius: 4 },
  month: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  line: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  lime: { color: Colors.lime, fontWeight: '800' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 4 },
  brandText: { color: Colors.text, fontWeight: '900', fontSize: 18 },
});
