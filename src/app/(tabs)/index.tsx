/** HOME — the progress dashboard: everything about today in one place. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { HabitList } from '@/components/HabitList';
import { ProgressRing } from '@/components/ProgressRing';
import { Badge, Button, Card, ProgressBar, Screen, SectionTitle, Stat, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { connectHealth } from '@/lib/health';
import { prettyDate, todayKey } from '@/store/dates';
import {
  achievements,
  currentStreak,
  dayProgress,
  dayTotals,
  weekPoints,
  workoutsOn,
} from '@/store/logic';
import { useStore } from '@/store/store';

export default function HomeScreen() {
  const { state } = useStore();
  const today = todayKey();
  const totals = dayTotals(state, today);
  const progress = dayProgress(state, today);
  const streak = currentStreak(state);
  const todaysWorkouts = workoutsOn(state, today);
  const unlocked = achievements(state).filter((a) => a.unlocked);

  return (
    <Screen
      right={
        <Pressable onPress={() => router.push('/profile')} style={s.avatar} hitSlop={8}>
          <Text style={{ color: Colors.background, fontWeight: '800' }}>
            {(state.profile?.name ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </Pressable>
      }>
      <View>
        <Text style={[Type.title, { color: Colors.text }]}>Hey {state.profile?.name ?? 'there'} 👋</Text>
        <Text style={ui.muted}>{prettyDate(today)}</Text>
      </View>
      {/* Streak + points */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Card highlight style={[ui.stat, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Ionicons name="flame" size={26} color={Colors.lime} />
          <View>
            <Text style={ui.statLabel}>Streak</Text>
            <Text style={ui.statValue}>{streak} days</Text>
          </View>
        </Card>
        <Card style={[ui.stat, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Ionicons name="flash" size={24} color={Colors.lime} />
          <View>
            <Text style={ui.statLabel}>Points this week</Text>
            <Text style={ui.statValue}>{weekPoints(state)}</Text>
          </View>
        </Card>
      </View>

      {/* Fuel */}
      <Pressable onPress={() => router.navigate('/nutrition')}>
        <Card style={{ alignItems: 'center', gap: Spacing.lg }}>
          <View style={{ alignSelf: 'stretch' }}>
            <SectionTitle action={<Badge text="FUEL" />}>Today&apos;s intake</SectionTitle>
          </View>
          <ProgressRing size={190} stroke={14} progress={totals.kcal / state.goals.kcal}>
            <Text style={[Type.hero, { color: Colors.text }]}>{Math.round(totals.kcal)}</Text>
            <Text style={ui.muted}>kcal / {state.goals.kcal.toLocaleString('en-US')}</Text>
          </ProgressRing>
          <View style={{ flexDirection: 'row', gap: Spacing.md, alignSelf: 'stretch' }}>
            <Macro label="Protein" value={totals.protein} goal={state.goals.protein} color={Colors.protein} />
            <Macro label="Carbs" value={totals.carbs} goal={state.goals.carbs} color={Colors.carbs} />
            <Macro label="Fat" value={totals.fat} goal={state.goals.fat} color={Colors.fat} />
          </View>
        </Card>
      </Pressable>

      {/* Build habits */}
      <Card style={{ gap: Spacing.md }}>
        <View style={s.rowBetween}>
          <Text style={[Type.heading, { color: Colors.text }]}>Daily habits</Text>
          <Text style={[Type.title, { color: Colors.lime }]}>{Math.round(progress * 100)}%</Text>
        </View>
        <ProgressBar progress={progress} />
        <HabitList date={today} />
      </Card>

      {/* Train */}
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

      {/* Recover (Health Connect) */}
      <RecoverCard />

      {/* Achievements */}
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle action={<Text style={ui.muted}>{unlocked.length} / {achievements(state).length}</Text>}>
          Achievements
        </SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {achievements(state).map((a) => (
            <View key={a.id} style={[s.achievement, a.unlocked && s.achievementOn]}>
              <Ionicons
                name={a.unlocked ? 'trophy' : 'lock-closed'}
                size={14}
                color={a.unlocked ? Colors.lime : Colors.textFaint}
              />
              <Text style={{ color: a.unlocked ? Colors.text : Colors.textFaint, fontSize: 12, fontWeight: '600' }}>
                {a.title}
              </Text>
            </View>
          ))}
        </View>
      </Card>
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
          Synced from Health Connect. 10,000 steps and sleep before 23:00 tick your habits automatically.
        </Text>
      ) : (
        <>
          <Text style={ui.muted}>
            Connect Health Connect to sync steps, sleep, heart rate and workouts from Garmin or any other watch.
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  achievementOn: { borderColor: Colors.limeBorder, backgroundColor: Colors.limeSoft },
});
