/** HOME — the progress dashboard: everything about today in one place. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HabitList } from '@/components/HabitList';
import { ProgressRing } from '@/components/ProgressRing';
import { Badge, Card, ProgressBar, Screen, SectionTitle, Stat, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
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
    <Screen right={<Text style={ui.muted}>{prettyDate(today)}</Text>}>
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

      {/* Recover (Garmin) */}
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle action={<Badge text="COMING SOON" />}>Recover</SectionTitle>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Stat label="Heart rate" value="—" unit="bpm" />
          <Stat label="Sleep" value="—" unit="hours" />
          <Stat label="Steps" value="—" unit="today" />
        </View>
        <Text style={ui.muted}>
          Connect Garmin to sync runs, heart rate, sleep and steps automatically.
        </Text>
      </Card>

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
