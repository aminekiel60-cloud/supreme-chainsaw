/** TRAIN — this week's totals, per-sport breakdown and your workout history. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CountUp, FadeInCard } from '@/components/motion';
import { Button, Card, Screen, SectionTitle, Stat, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { prettyDate, startOfWeek, todayKey } from '@/store/dates';
import { SPORTS, formatDistance, pace, sport } from '@/store/logic';
import { useStore } from '@/store/store';

export default function TrainingScreen() {
  const { state } = useStore();
  const weekStart = startOfWeek(todayKey());
  const thisWeek = state.workouts.filter((w) => w.date >= weekStart);
  const km = thisWeek.reduce((t, w) => t + (w.distanceKm ?? 0), 0);
  const minutes = thisWeek.reduce((t, w) => t + w.durationMin, 0);
  const history = [...state.workouts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const perSport = SPORTS.map((sp) => ({ ...sp, count: thisWeek.filter((w) => w.type === sp.id).length })).filter((sp) => sp.count);

  return (
    <Screen>
      <Text style={[Type.title, { color: Colors.text }]}>Train</Text>

      <FadeInCard index={0} style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Card style={[ui.stat, { gap: 2 }]}>
          <Text style={ui.statLabel}>Workouts</Text>
          <CountUp value={thisWeek.length} style={ui.statValue} />
          <Text style={ui.statUnit}>this week</Text>
        </Card>
        <Stat label="Distance" value={km.toFixed(1)} unit="km" />
        <Stat
          label="Time"
          value={minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}` : String(minutes)}
          unit={minutes >= 60 ? 'hours' : 'min'}
        />
      </FadeInCard>

      {perSport.length > 0 && (
        <FadeInCard index={1} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {perSport.map((sp) => (
            <View key={sp.id} style={s.pill}>
              <Ionicons name={sp.icon} size={14} color={Colors.lime} />
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 13 }}>
                {sp.count}× {sp.label}
              </Text>
            </View>
          ))}
        </FadeInCard>
      )}

      <FadeInCard index={2}>
        <Button title="Log workout" icon="add" onPress={() => router.push('/log-workout')} />
      </FadeInCard>

      <SectionTitle>History</SectionTitle>
      {history.length === 0 && (
        <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: 28 }}>
          <Ionicons name="barbell" size={34} color={Colors.textFaint} />
          <Text style={[ui.muted, { textAlign: 'center' }]}>No workouts yet. Your first one earns XP and the “Warming up” badge progress.</Text>
        </Card>
      )}
      {history.map((w, i) => {
        const info = sport(w.type);
        const p = pace(w);
        return (
          <FadeInCard key={w.id} index={Math.min(i, 6) + 3}>
            <Pressable onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}>
              <Card style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
                {w.photoUri ? (
                  <Image source={{ uri: w.photoUri }} style={s.thumb} contentFit="cover" />
                ) : (
                  <View style={[s.thumb, s.iconThumb]}>
                    <Ionicons name={info.icon} size={24} color={Colors.lime} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[ui.text, { fontWeight: '800' }]} numberOfLines={1}>
                    {w.title}
                  </Text>
                  <Text style={ui.muted}>
                    {prettyDate(w.date)} · {w.durationMin} min
                    {w.distanceKm ? ` · ${formatDistance(w)}` : ''}
                    {p ? ` · ${p}` : ''}
                  </Text>
                  {w.tagged?.length ? <Text style={[ui.muted, { color: Colors.lime }]}>with {w.tagged.map((t) => t.name).join(', ')}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
              </Card>
            </Pressable>
          </FadeInCard>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.limeSoft,
  },
  thumb: { width: 56, height: 56, borderRadius: Radius.sm },
  iconThumb: { backgroundColor: Colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
});
