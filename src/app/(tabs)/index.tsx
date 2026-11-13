/** HOME — the progress dashboard: everything about today in one place. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActiveWorkoutBanner } from '@/components/ActiveWorkoutBanner';
import { Avatar } from '@/components/Avatar';
import { HabitList } from '@/components/HabitList';
import { LevelCard } from '@/components/LevelCard';
import { CountUp, FadeInCard } from '@/components/motion';
import { ProgressRing } from '@/components/ProgressRing';
import { WaterCard } from '@/components/WaterCard';
import { WeekStrip } from '@/components/WeekStrip';
import { Badge, Button, Card, ProgressBar, Screen, SectionTitle, Stat, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { connectHealth } from '@/lib/health';
import { prettyDate, todayKey } from '@/store/dates';
import {
  currentStreak,
  dayProgress,
  dayTotals,
  weekPoints,
  workoutsOn,
} from '@/store/logic';
import { levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';

export default function HomeScreen() {
  const { state } = useStore();
  const today = todayKey();
  const totals = dayTotals(state, today);
  const progress = dayProgress(state, today);
  const streak = currentStreak(state);
  const todaysWorkouts = workoutsOn(state, today);

  return (
    <Screen
      right={
        <Pressable onPress={() => router.navigate('/profile')} hitSlop={8}>
          <Avatar name={state.profile?.name ?? '?'} size={38} level={levelInfo(totalXp(state)).level} highlight />
        </Pressable>
      }>
      <View>
        <Text style={[Type.title, { color: Colors.text }]}>Hey {state.profile?.name ?? 'there'} 👋</Text>
        <Text style={ui.muted}>{prettyDate(today)}</Text>
      </View>

      <ActiveWorkoutBanner />

      <FadeInCard index={0}>
        <Card style={{ paddingVertical: 12, gap: 10 }}>
          <WeekStrip />
          <Pressable onPress={() => router.push('/review')} style={s.reviewLink} hitSlop={6}>
            <Ionicons name="stats-chart" size={14} color={Colors.lime} />
            <Text style={{ color: Colors.lime, fontWeight: '700' }}>Week in review</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.lime} />
          </Pressable>
        </Card>
      </FadeInCard>

      {/* Streak + points */}
      <FadeInCard index={1} style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Card highlight style={[ui.stat, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Ionicons name="flame" size={26} color={Colors.lime} />
          <View>
            <Text style={ui.statLabel}>Streak</Text>
            <Text style={ui.statValue}>
              {streak} {streak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </Card>
        <Card style={[ui.stat, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Ionicons name="flash" size={24} color={Colors.lime} />
          <View>
            <Text style={ui.statLabel}>Points this week</Text>
            <CountUp value={weekPoints(state)} style={ui.statValue} />
          </View>
        </Card>
      </FadeInCard>

      {/* Fuel */}
      <FadeInCard index={2}>
        <Pressable onPress={() => router.navigate('/nutrition')}>
          <Card style={{ alignItems: 'center', gap: Spacing.lg }}>
            <View style={{ alignSelf: 'stretch' }}>
              <SectionTitle action={<Badge text="FUEL" />}>Today&apos;s intake</SectionTitle>
            </View>
            <ProgressRing size={190} stroke={14} progress={totals.kcal / state.goals.kcal}>
              <CountUp value={Math.round(totals.kcal)} style={[Type.hero, { color: Colors.text }]} />
              <Text style={ui.muted}>kcal / {state.goals.kcal.toLocaleString('en-US')}</Text>
            </ProgressRing>
            <View style={{ flexDirection: 'row', gap: Spacing.md, alignSelf: 'stretch' }}>
              <Macro label="Protein" value={totals.protein} goal={state.goals.protein} color={Colors.protein} />
              <Macro label="Carbs" value={totals.carbs} goal={state.goals.carbs} color={Colors.carbs} />
              <Macro label="Fat" value={totals.fat} goal={state.goals.fat} color={Colors.fat} />
            </View>
          </Card>
        </Pressable>
      </FadeInCard>

      {/* Water */}
      <FadeInCard index={3}>
        <WaterCard />
      </FadeInCard>

      {/* Build habits */}
      <FadeInCard index={4}>
        <Card style={{ gap: Spacing.md }}>
          <View style={s.rowBetween}>
            <Text style={[Type.heading, { color: Colors.text }]}>Daily habits</Text>
            <CountUp value={Math.round(progress * 100)} format={(n) => `${n}%`} style={[Type.title, { color: Colors.lime }]} />
          </View>
          <ProgressBar progress={progress} />
          <HabitList date={today} />
        </Card>
      </FadeInCard>

      {/* Train */}
      <FadeInCard index={5}>
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle action={<Badge text="TRAIN" />}>Today&apos;s training</SectionTitle>
          {todaysWorkouts.length === 0 ? (
            <Pressable onPress={() => router.push('/log-workout')} style={s.empty}>
              <Ionicons name="add-circle" size={22} color={Colors.lime} />
              <Text style={ui.text}>No workout yet — log one</Text>
            </Pressable>
          ) : (
            todaysWorkouts.map((w) => (
              <View key={w.id} style={s.rowBetween}>
                <Text style={ui.text}>{w.title}</Text>
                <Text style={ui.muted}>
                  {w.distanceKm ? `${w.distanceKm} km · ` : ''}
                  {w.durationMin} min
                </Text>
              </View>
            ))
          )}
        </Card>
      </FadeInCard>

      {/* Recover (Health Connect) */}
      <FadeInCard index={6}>
        <RecoverCard />
      </FadeInCard>

      {/* Level */}
      <FadeInCard index={7}>
        <Pressable onPress={() => router.navigate('/profile')}>
          <LevelCard compact />
        </Pressable>
      </FadeInCard>
    </Screen>
  );
}

function RecoverCard() {
  const { state, dispatch } = useStore();
  const today = state.health[todayKey()];
  const connected = state.settings.healthConnect;
  const fmtSleep = (m: number) => (m > 0 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}` : '—');

  const connect = async () => {
    if (!(await connectHealth())) {
      Alert.alert(
        'Health Connect',
        Platform.OS === 'android'
          ? 'Install or update Health Connect from the Play Store, open your watch app (e.g. Garmin Connect) and allow it to share data with Health Connect. Then try again.'
          : 'Health Connect is only available on Android.',
      );
      return;
    }
    dispatch({ type: 'setSettings', settings: { ...state.settings, healthConnect: true } });
  };

  return (
    <Card style={{ gap: Spacing.md }}>
      <SectionTitle action={<Badge text={connected ? 'SYNCED' : 'RECOVER'} />}>Recover</SectionTitle>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Stat label="Resting HR" value={today?.restingHeartRate ? String(today.restingHeartRate) : '—'} unit="bpm" />
        <Stat label="Sleep" value={fmtSleep(today?.sleepMinutes ?? 0)} unit="last night" />
        <Stat label="Steps" value={today ? today.steps.toLocaleString('en-US') : '—'} unit="today" />
      </View>
      {connected ? (
        <Text style={ui.muted}>
          Synced from Health Connect. Your steps and sleep goals tick themselves.
        </Text>
      ) : (
        <>
          <Text style={ui.muted}>
            Sync steps, sleep, heart rate and workouts from Samsung Health, Garmin, Fitbit or any other watch via Health Connect.
          </Text>
          <Button title="Connect Health Connect" icon="heart" variant="ghost" onPress={connect} />
        </>
      )}
    </Card>
  );
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={ui.statLabel}>{label}</Text>
      <Text style={{ color: Colors.text, fontWeight: '700' }}>
        {Math.round(value)}
        <Text style={ui.muted}> / {goal} g</Text>
      </Text>
      <ProgressBar progress={value / goal} color={color} />
    </View>
  );
}

const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reviewLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
