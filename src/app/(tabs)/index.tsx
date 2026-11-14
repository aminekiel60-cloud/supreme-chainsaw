/** TODAY: your day at a glance. Big lock ring, three small rings, quick actions and your activity. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActiveWorkoutBanner } from '@/components/ActiveWorkoutBanner';
import { HabitList } from '@/components/HabitList';
import { MiniRing, Pill, Section, TabPage } from '@/components/layout';
import { CountUp, FadeInCard } from '@/components/motion';
import { ProgressRing } from '@/components/ProgressRing';
import { WaterCard } from '@/components/WaterCard';
import { Button, Card, ProgressBar, Stat, styles as ui, type IconName } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { connectHealth } from '@/lib/health';
import { haptics } from '@/lib/haptics';
import { startWorkout } from '@/lib/workouts';
import { addDays, prettyDate, startOfWeek, todayKey } from '@/store/dates';
import { HABITS, LOCKED_IN_THRESHOLD, currentStreak, dayProgress, dayTotals, goalsFor, habitDone, readiness, weekPoints, workoutsOn } from '@/store/logic';
import { useStore } from '@/store/store';
import type { DateKey, Meal } from '@/store/types';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The meal you're most likely logging right now. */
function mealNow(): Meal {
  const h = new Date().getHours();
  if (h < 10) return 'Breakfast';
  if (h < 15) return 'Lunch';
  if (h < 21) return 'Dinner';
  return 'Snacks';
}

export default function TodayScreen() {
  const { state, dispatch } = useStore();
  const today = todayKey();
  const [day, setDay] = useState<DateKey>(today);
  const isToday = day === today;
  const progress = dayProgress(state, day);
  const locked = progress >= LOCKED_IN_THRESHOLD;
  const doneCount = HABITS.filter((h) => habitDone(state, day, h.id)).length;
  const totals = dayTotals(state, day);
  const goals = goalsFor(state, day);
  const steps = state.health[day]?.steps ?? 0;
  const water = state.water[day] ?? 0;
  const ringCalories = state.settings.bigRing === 'calories';
  const kcalLeft = goals.kcal - totals.kcal;

  const dayLabel = isToday ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : prettyDate(day);

  const workout = () => {
    if (!state.activeWorkout) startWorkout(state, dispatch);
    router.push('/active-workout');
  };

  return (
    <TabPage>
      {/* Day switcher */}
      <View style={s.dayRow}>
        <Pressable hitSlop={14} onPress={() => setDay(addDays(day, -1))} accessibilityLabel="Previous day">
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Pressable onPress={() => setDay(today)} disabled={isToday}>
          <Text style={s.dayLabel}>{dayLabel}</Text>
        </Pressable>
        <Pressable hitSlop={14} disabled={isToday} onPress={() => setDay(addDays(day, 1))} accessibilityLabel="Next day">
          <Ionicons name="chevron-forward" size={22} color={isToday ? Colors.textFaint : Colors.text} />
        </Pressable>
      </View>

      {isToday && <ActiveWorkoutBanner />}

      {/* Big ring: calories or habits, your choice in Settings */}
      {ringCalories ? (
        <FadeInCard index={0} style={{ alignItems: 'center', gap: 6 }}>
          <Pressable onPress={() => router.push({ pathname: '/nutrition', params: { date: day } })} accessibilityLabel="Open food diary">
            <ProgressRing size={210} stroke={14} progress={totals.kcal / goals.kcal} color={totals.kcal > goals.kcal ? Colors.fat : Colors.lime}>
              <CountUp value={Math.round(totals.kcal)} format={(n) => n.toLocaleString('en-US')} style={[Type.hero, { color: Colors.text, fontSize: 48 }]} />
              <Text style={ui.muted}>kcal of {goals.kcal.toLocaleString('en-US')}</Text>
            </ProgressRing>
          </Pressable>
          <Text style={{ color: kcalLeft >= 0 ? Colors.lime : Colors.fat, fontWeight: '800', fontSize: 16 }}>
            {Math.abs(Math.round(kcalLeft)).toLocaleString('en-US')} kcal {kcalLeft >= 0 ? 'left' : 'over'}
          </Text>
        </FadeInCard>
      ) : (
        <FadeInCard index={0} style={{ alignItems: 'center', gap: 6 }}>
          <Pressable onPress={() => router.push('/calendar')} accessibilityLabel="Open calendar">
            <ProgressRing size={200} stroke={14} progress={progress} color={Colors.lime}>
              <Ionicons name={locked ? 'lock-closed' : 'lock-open-outline'} size={54} color={locked ? Colors.lime : Colors.text} />
            </ProgressRing>
          </Pressable>
          <CountUp value={doneCount} format={(n) => `${n} of ${HABITS.length}`} style={[Type.hero, { color: Colors.text, fontSize: 40 }]} />
          <Text style={ui.muted}>{locked ? (isToday ? 'You are locked in today' : 'Locked in') : `Habits done. ${Math.ceil(HABITS.length * LOCKED_IN_THRESHOLD)} locks the day.`}</Text>
        </FadeInCard>
      )}

      {/* Three small rings */}
      <FadeInCard index={1} style={{ flexDirection: 'row' }}>
        {ringCalories ? (
          <MiniRing
            icon={locked ? 'lock-closed' : 'lock-open-outline'}
            value={`${doneCount} of ${HABITS.length}`}
            label={locked ? 'locked in' : 'habits done'}
            progress={progress}
            onPress={() => router.push('/calendar')}
          />
        ) : (
          <MiniRing
            icon="flame"
            value={Math.round(totals.kcal).toLocaleString('en-US')}
            label={`of ${goals.kcal.toLocaleString('en-US')} kcal`}
            progress={totals.kcal / goals.kcal}
            color={totals.kcal > goals.kcal ? Colors.fat : Colors.lime}
            onPress={() => router.push('/nutrition')}
          />
        )}
        <MiniRing
          icon="barbell"
          value={`${Math.round(totals.protein)} g`}
          label={`of ${goals.protein} g protein`}
          progress={totals.protein / goals.protein}
          color={Colors.carbs}
          onPress={() => router.push('/nutrition')}
        />
        {state.settings.healthConnect ? (
          <MiniRing
            icon="footsteps"
            value={steps.toLocaleString('en-US')}
            label={`of ${state.goals.steps.toLocaleString('en-US')} steps`}
            progress={steps / state.goals.steps}
            color="#B98CFF"
            onPress={() => router.push('/devices')}
          />
        ) : (
          <MiniRing
            icon="water"
            value={`${(water / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} L`}
            label={`of ${(state.goals.waterMl / 1000).toLocaleString('en-US')} L water`}
            progress={water / state.goals.waterMl}
            color="#4FA8FF"
          />
        )}
      </FadeInCard>

      {/* Quick actions */}
      {isToday && (
        <FadeInCard index={2} style={s.actions}>
          <Action icon="restaurant" label="Food" onPress={() => router.push({ pathname: '/add-food', params: { meal: mealNow(), date: today } })} />
          <Action icon={state.activeWorkout ? 'play' : 'barbell'} label={state.activeWorkout ? 'Resume' : 'Workout'} onPress={workout} />
          <Action
            icon="water"
            label="Water"
            onPress={() => {
              haptics.tap();
              dispatch({ type: 'addWater', date: today, ml: state.settings.bottleMl });
            }}
          />
          <Action icon="scale" label="Weight" onPress={() => router.push('/body-weight')} />
        </FadeInCard>
      )}

      <Section title="Activity" />

      <FadeInCard index={3}>
        <ExerciseDays day={day} />
      </FadeInCard>

      <FadeInCard index={4}>
        <FoodCard day={day} />
      </FadeInCard>

      {isToday && (
        <FadeInCard index={5}>
          <WaterCard />
        </FadeInCard>
      )}

      <FadeInCard index={6}>
        <Card style={{ gap: Spacing.md }}>
          <View style={s.rowBetween}>
            <Text style={[Type.heading, { color: Colors.text }]}>Daily habits</Text>
            <Text style={{ color: Colors.lime, fontWeight: '800' }}>{Math.round(progress * 100)}%</Text>
          </View>
          <ProgressBar progress={progress} />
          <HabitList date={day} />
        </Card>
      </FadeInCard>

      {isToday && (
        <FadeInCard index={7}>
          <RecoverCard />
        </FadeInCard>
      )}

      {isToday && (
        <FadeInCard index={8} style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/calendar')}>
            <Card highlight style={s.smallCard}>
              <Ionicons name="flame" size={22} color={Colors.lime} />
              <Text style={ui.statLabel}>Streak</Text>
              <Text style={ui.statValue}>{currentStreak(state)} {currentStreak(state) === 1 ? 'day' : 'days'}</Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/review')}>
            <Card style={s.smallCard}>
              <Ionicons name="stats-chart" size={20} color={Colors.lime} />
              <Text style={ui.statLabel}>Points this week</Text>
              <Text style={ui.statValue}>{weekPoints(state)}</Text>
            </Card>
          </Pressable>
        </FadeInCard>
      )}
    </TabPage>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.action, pressed && { opacity: 0.7 }]} accessibilityLabel={label}>
      <View style={s.actionIcon}>
        <Ionicons name={icon} size={22} color={Colors.background} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </Pressable>
  );
}

/** Fitbit's "Exercise days": how many days you trained this week, with a bar per day. */
function ExerciseDays({ day }: { day: DateKey }) {
  const { state } = useStore();
  const monday = startOfWeek(day);
  const today = todayKey();
  const days = LETTERS.map((_, i) => addDays(monday, i));
  const trained = days.filter((d) => workoutsOn(state, d).length > 0).length;
  const goal = state.goals.workoutsPerWeek;

  return (
    <Pressable onPress={() => router.push('/history')}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[ui.text, { fontWeight: '700' }]}>Exercise days</Text>
          <Text style={{ color: Colors.text, fontSize: 34, fontWeight: '900' }}>
            {trained} <Text style={{ fontSize: 18, color: Colors.textMuted }}>of {goal}</Text>
          </Text>
          <Text style={ui.muted}>{trained >= goal ? 'Weekly goal reached' : 'This week'}</Text>
        </View>
        <View style={s.bars}>
          {days.map((d, i) => {
            const did = workoutsOn(state, d).length > 0;
            return (
              <View key={d} style={{ alignItems: 'center', gap: 4 }}>
                <View style={[s.bar, did && s.barDone, d === today && !did && s.barToday]}>
                  {did && <Ionicons name="checkmark" size={12} color={Colors.background} />}
                </View>
                <Text style={[s.barLetter, d === today && { color: Colors.lime }]}>{LETTERS[i]}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    </Pressable>
  );
}

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

function FoodCard({ day }: { day: DateKey }) {
  const { state } = useStore();
  const totals = dayTotals(state, day);
  const goals = goalsFor(state, day);
  const left = goals.kcal - totals.kcal;

  return (
    <Pressable onPress={() => router.push({ pathname: '/nutrition', params: { date: day } })}>
      <Card style={{ gap: Spacing.md }}>
        <View style={s.rowBetween}>
          <Text style={[Type.heading, { color: Colors.text }]}>Food</Text>
          <Text style={{ color: left >= 0 ? Colors.lime : Colors.fat, fontWeight: '800' }}>
            {Math.abs(Math.round(left)).toLocaleString('en-US')} kcal {left >= 0 ? 'left' : 'over'}
          </Text>
        </View>
        {goals.trainingDay && <Pill icon="barbell" text={`Training day: +${state.goals.trainingDayKcal} kcal`} />}
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <Macro label="Protein" value={totals.protein} goal={goals.protein} color={Colors.protein} />
          <Macro label="Carbs" value={totals.carbs} goal={goals.carbs} color={Colors.carbs} />
          <Macro label="Fat" value={totals.fat} goal={goals.fat} color={Colors.fat} />
        </View>
        <View style={s.meals}>
          {MEALS.map((meal) => {
            const kcal = state.food.filter((f) => f.date === day && f.meal === meal).reduce((t, f) => t + f.kcal, 0);
            return (
              <View key={meal} style={s.meal}>
                <Text style={ui.muted}>{meal}</Text>
                <Text style={{ color: kcal ? Colors.text : Colors.textFaint, fontWeight: '800' }}>{Math.round(kcal)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{ color: Colors.lime, fontWeight: '700', textAlign: 'center' }}>Open food diary</Text>
      </Card>
    </Pressable>
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

function RecoverCard() {
  const { state, dispatch } = useStore();
  const today = state.health[todayKey()];
  const connected = state.settings.healthConnect;
  const ready = readiness(state);
  const fmtSleep = (m: number) => (m > 0 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}` : 'none');

  const connect = async () => {
    if (!(await connectHealth())) {
      Alert.alert(
        'Health Connect',
        Platform.OS === 'android'
          ? 'Install or update Health Connect from the Play Store. Then open your watch app (for example Garmin Connect) and let it share data with Health Connect.'
          : 'Health Connect is only available on Android.',
      );
      return;
    }
    dispatch({ type: 'setSettings', settings: { ...state.settings, healthConnect: true } });
  };

  return (
    <Card style={{ gap: Spacing.md }}>
      <Text style={[Type.heading, { color: Colors.text }]}>Recovery</Text>
      {ready && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
          <ProgressRing size={76} stroke={8} progress={ready.score / 100} color={ready.score >= 60 ? Colors.lime : Colors.fat}>
            <Text style={{ color: Colors.text, fontWeight: '900', fontSize: 20 }}>{ready.score}</Text>
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <Text style={ui.statLabel}>READINESS</Text>
            <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 17 }}>{ready.label}</Text>
            <Text style={ui.muted}>{ready.advice}</Text>
          </View>
        </View>
      )}
      {connected ? (
        <>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Stat label="Sleep" value={fmtSleep(today?.sleepMinutes ?? 0)} unit="last night" />
            <Stat label="Resting HR" value={today?.restingHeartRate ? String(today.restingHeartRate) : 'none'} unit="bpm" />
            <Stat label="HRV" value={today?.hrv ? String(today.hrv) : 'none'} unit="ms" />
          </View>
          {today?.deepMinutes !== undefined && today.sleepMinutes > 0 && (
            <View style={{ gap: 6 }}>
              <View style={s.sleepBar}>
                <View style={{ flex: today.deepMinutes || 0.01, backgroundColor: '#5B6CFF' }} />
                <View style={{ flex: today.remMinutes || 0.01, backgroundColor: Colors.carbs }} />
                <View style={{ flex: today.lightMinutes || 0.01, backgroundColor: '#3A4A66' }} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Pill text={`Deep ${fmtSleep(today.deepMinutes)}`} />
                <Pill text={`REM ${fmtSleep(today.remMinutes ?? 0)}`} />
                <Pill text={`Light ${fmtSleep(today.lightMinutes ?? 0)}`} />
              </View>
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={ui.muted}>Connect your watch to see sleep, heart rate and a daily readiness score. Works with Garmin, Samsung, Fitbit, Polar and more.</Text>
          <Button title="Connect Health Connect" icon="heart" variant="ghost" onPress={connect} />
        </>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  dayLabel: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', gap: 6, width: 72 },
  actionIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { width: 18, height: 44, borderRadius: 9, backgroundColor: Colors.cardRaised, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  barDone: { backgroundColor: Colors.lime },
  barToday: { borderWidth: 1, borderColor: Colors.limeBorder },
  barLetter: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  meals: { flexDirection: 'row', backgroundColor: Colors.cardRaised, borderRadius: Radius.md, padding: 10 },
  meal: { flex: 1, alignItems: 'center', gap: 2 },
  smallCard: { gap: 4, padding: 14 },
  sleepBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: Colors.border },
});

