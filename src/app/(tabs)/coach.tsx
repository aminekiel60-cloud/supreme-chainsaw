/** COACH: start training, follow a program, browse tools, see your week and recent workouts. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ActiveWorkoutBanner } from '@/components/ActiveWorkoutBanner';
import { HeroCard, Pill, Section, TabPage, Tile } from '@/components/layout';
import { CountUp, FadeInCard } from '@/components/motion';
import { MuscleBalance } from '@/components/MuscleBalance';
import { WorkoutRow } from '@/components/WorkoutRow';
import { ProgressRing } from '@/components/ProgressRing';
import { Card, Stat, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { nextProgramDay, startProgramDay, startWorkout } from '@/lib/workouts';
import { prettyDate, startOfWeek, todayKey } from '@/store/dates';
import { exerciseVolume } from '@/store/exercises';
import { readiness } from '@/store/logic';
import { useStore } from '@/store/store';

export default function CoachScreen() {
  const { state, dispatch } = useStore();
  const { width } = useWindowDimensions();
  const heroWidth = Math.min(width - 56, 420);
  const weekStart = startOfWeek(todayKey());
  const thisWeek = state.workouts.filter((w) => w.date >= weekStart);
  const minutes = thisWeek.reduce((t, w) => t + w.durationMin, 0);
  const km = thisWeek.reduce((t, w) => t + (w.distanceKm ?? 0), 0);
  const volume = thisWeek.reduce((t, w) => t + (w.exercises ?? []).reduce((v, e) => v + exerciseVolume(e), 0), 0);
  const recent = [...state.workouts].reverse().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 3);
  const next = nextProgramDay(state);
  const ready = readiness(state);

  const open = () => router.push('/active-workout');
  const quickStart = () => {
    if (!state.activeWorkout) startWorkout(state, dispatch);
    open();
  };

  return (
    <TabPage>
      <ActiveWorkoutBanner />

      {/* Hero cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={heroWidth + 12}
        decelerationRate="fast"
        style={{ marginHorizontal: -Spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: 12 }}>
        {next ? (
          <HeroCard
            icon="barbell"
            kicker={`NEXT IN ${next.program.name.toUpperCase()}`}
            title={next.day.name}
            detail={`${next.day.exercises.length} exercises. About ${estimateMinutes(next.day.exercises)} min.`}
            width={heroWidth}
            onPress={() => {
              if (state.activeWorkout) return open();
              startProgramDay(state, dispatch, next.program, next.day);
              open();
            }}>
            <Pill icon="play" text="Start" active />
          </HeroCard>
        ) : (
          <HeroCard
            icon="map"
            kicker="TRAINING PROGRAMS"
            title="Follow a plan"
            detail="Pick a program and the app tells you what to lift next, with the weights."
            width={heroWidth}
            onPress={() => router.push('/programs')}>
            <Pill icon="arrow-forward" text="Browse programs" active />
          </HeroCard>
        )}
        <HeroCard
          icon="flash"
          tint="teal"
          kicker="QUICK START"
          title={state.activeWorkout ? 'Back to your workout' : 'Empty workout'}
          detail={state.activeWorkout ? 'Your workout is still running.' : 'Add exercises as you go. Timer and rest timer included.'}
          width={heroWidth}
          onPress={quickStart}>
          <Pill icon="play" text={state.activeWorkout ? 'Resume' : 'Start'} active />
        </HeroCard>
        <HeroCard
          icon="navigate"
          tint="blue"
          kicker="OUTDOORS"
          title="Track a run"
          detail="GPS route, distance, pace and splits per km. Also for walks and rides."
          width={heroWidth}
          onPress={() => router.push('/run')}>
          <Pill icon="play" text="Start" active />
        </HeroCard>
        {state.routines.slice(0, 3).map((r) => (
          <HeroCard
            key={r.id}
            icon="list"
            tint="violet"
            kicker="YOUR ROUTINE"
            title={r.name}
            detail={`${r.exercises.length} exercises${r.lastUsed ? `. Last done ${prettyDate(r.lastUsed)}.` : ''}`}
            width={heroWidth}
            onPress={() => {
              if (state.activeWorkout) return open();
              startWorkout(state, dispatch, r);
              open();
            }}>
            <Pill icon="play" text="Start" active />
          </HeroCard>
        ))}
      </ScrollView>

      <Section title="Collections" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.lg }} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: 10 }}>
        <Tile icon="map" label="Programs" detail={state.program ? 'Following one' : '5 plans'} onPress={() => router.push('/programs')} />
        <Tile icon="list" label="Routines" detail={`${state.routines.length} saved`} tint="violet" onPress={() => router.push('/routines')} />
        <Tile icon="book" label="Exercises" detail="Library and records" tint="teal" onPress={() => router.push({ pathname: '/exercise-picker', params: { target: 'browse' } })} />
        <Tile icon="create" label="Log a workout" detail="Afterwards, by hand" tint="amber" onPress={() => router.push('/log-workout')} />
        <Tile icon="calculator" label="1RM and plates" detail="Calculators" tint="coral" onPress={() => router.push('/tools')} />
        <Tile icon="trophy" label="Records" detail="Your best lifts" tint="blue" onPress={() => router.push('/records')} />
      </ScrollView>

      <Section title="This week" onSeeAll={() => router.push('/review')} seeAllLabel="Week in review" />
      <FadeInCard index={0} style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Card style={[ui.stat, { gap: 2 }]}>
          <Text style={ui.statLabel}>Workouts</Text>
          <CountUp value={thisWeek.length} style={ui.statValue} />
          <Text style={ui.statUnit}>of {state.goals.workoutsPerWeek}</Text>
        </Card>
        <Stat label="Time" value={minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}`} unit={minutes >= 60 ? 'active' : 'min'} />
        {km > 0 ? <Stat label="Distance" value={km.toFixed(1)} unit="km" /> : <Stat label="Volume" value={volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : String(volume)} unit={volume >= 1000 ? 'lifted' : 'kg'} />}
      </FadeInCard>
      <MuscleBalance />

      <Section title="Weekly coach" />
      <Pressable onPress={() => router.push('/weekly-coach')}>
        <Card highlight style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={s.coachIcon}>
            <Ionicons name="sparkles" size={22} color={Colors.background} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ui.text, { fontWeight: '800' }]}>Your week, explained</Text>
            <Text style={ui.muted}>Tips on training, food and sleep, based on what you logged.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.lime} />
        </Card>
      </Pressable>

      {ready && (
        <>
          <Section title="Recover better" />
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
            <ProgressRing size={70} stroke={7} progress={ready.score / 100} color={ready.score >= 60 ? Colors.lime : Colors.fat}>
              <Text style={{ color: Colors.text, fontWeight: '900', fontSize: 18 }}>{ready.score}</Text>
            </ProgressRing>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[ui.text, { fontWeight: '800' }]}>{ready.label}</Text>
              <Text style={ui.muted}>{ready.advice}</Text>
            </View>
          </Card>
        </>
      )}

      <Section title="Recent workouts" onSeeAll={state.workouts.length > 3 ? () => router.push('/history') : undefined} />
      {recent.length === 0 && (
        <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: 28 }}>
          <Ionicons name="barbell" size={34} color={Colors.textFaint} />
          <Text style={[ui.muted, { textAlign: 'center' }]}>No workouts yet. Start one above and it shows up here.</Text>
        </Card>
      )}
      {recent.map((w) => (
        <WorkoutRow key={w.id} workout={w} />
      ))}
    </TabPage>
  );
}

function estimateMinutes(exercises: { sets: number; restSeconds: number }[]) {
  const seconds = exercises.reduce((t, e) => t + e.sets * (45 + e.restSeconds), 0);
  return Math.round(seconds / 60 / 5) * 5;
}

const s = StyleSheet.create({
  coachIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
});

