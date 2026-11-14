/**
 * BODY MAP: tap a muscle to see the exercises that train it. Turn the body
 * round for the back. The colours show how many sets each muscle got this week.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming, runOnJS } from 'react-native-reanimated';

import { BodyMap, heatColor, type Side } from '@/components/BodyMap';
import { Card, Chip, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { exerciseGuide } from '@/data/exerciseGuide';
import { EXERCISE_LIBRARY, MUSCLE_LABELS } from '@/data/exercises';
import { haptics } from '@/lib/haptics';
import { prefillSets } from '@/lib/workouts';
import { muscleSetsThisWeek } from '@/store/exercises';
import { useStore } from '@/store/store';
import type { MuscleGroup } from '@/store/types';

const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  other: 'Other',
};

const BOTH_SIDES: MuscleGroup[] = ['shoulders', 'calves'];
const SIDE_OF: Partial<Record<MuscleGroup, Side>> = {
  chest: 'front',
  biceps: 'front',
  core: 'front',
  quads: 'front',
  back: 'back',
  triceps: 'back',
  glutes: 'back',
  hamstrings: 'back',
};

export default function AnatomyScreen() {
  const { state, dispatch } = useStore();
  const [side, setSide] = useState<Side>('front');
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  const [heat, setHeat] = useState(true);
  const turn = useSharedValue(0);
  const sets = muscleSetsThisWeek(state);

  // Turn round: squeeze to 0 width, swap the side, open again (a 3D-looking flip).
  const flip = () => {
    haptics.tap();
    const next: Side = side === 'front' ? 'back' : 'front';
    turn.value = withSequence(
      withTiming(90, { duration: 180 }, (done) => {
        if (done) runOnJS(turnTo)(next);
      }),
      withTiming(0, { duration: 220 }),
    );
  };
  function turnTo(next: Side) {
    setSide(next);
    // Keep the selection only for muscles you can see from both sides.
    setSelected((m) => (m && (BOTH_SIDES.includes(m) || SIDE_OF[m] === next) ? m : null));
  }
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateY: `${turn.value}deg` }] }));

  const pick = (m: MuscleGroup) => {
    haptics.tap();
    setSelected(m === selected ? null : m);
  };

  const exercises = selected
    ? [
        ...EXERCISE_LIBRARY.filter((e) => e.muscle === selected).map((e) => ({ name: e.name, equipment: EQUIPMENT_LABELS[e.equipment] })),
        ...state.customExercises.filter((e) => e.muscle === selected).map((e) => ({ name: e.name, equipment: 'Your exercise' })),
      ]
    : [];

  const addToWorkout = (name: string) => {
    const aw = state.activeWorkout;
    if (!aw) return;
    haptics.add();
    dispatch({ type: 'setActiveWorkout', workout: { ...aw, exercises: [...aw.exercises, { name, sets: prefillSets(state, name) }] } });
    router.push('/active-workout');
  };

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={s.page}>
      <View style={s.toolbar}>
        <Chip label={side === 'front' ? 'Front' : 'Back'} active onPress={flip} />
        <Pressable onPress={flip} style={s.turn} accessibilityLabel="Turn the body round">
          <Ionicons name="sync" size={18} color={Colors.lime} />
          <Text style={{ color: Colors.lime, fontWeight: '800' }}>Turn round</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Chip label="This week" active={heat} onPress={() => setHeat(!heat)} />
      </View>

      <Animated.View style={[{ alignItems: 'center' }, bodyStyle]}>
        <BodyMap side={side} selected={selected} onSelect={pick} fill={heat ? (m) => heatColor(sets[m]) : undefined} width={230} />
      </Animated.View>

      {heat && !selected && (
        <View style={s.legend}>
          <View style={[s.swatch, { backgroundColor: heatColor(0) }]} />
          <Text style={ui.muted}>0 sets</Text>
          <View style={[s.swatch, { backgroundColor: heatColor(5) }]} />
          <Text style={ui.muted}>5</Text>
          <View style={[s.swatch, { backgroundColor: heatColor(12) }]} />
          <Text style={ui.muted}>10+ sets this week</Text>
        </View>
      )}

      {!selected ? (
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Ionicons name="finger-print" size={26} color={Colors.lime} />
          <Text style={[ui.text, { fontWeight: '700', textAlign: 'center' }]}>Tap a muscle to see its exercises</Text>
          <Text style={[ui.muted, { textAlign: 'center' }]}>Turn the body round for back, triceps, glutes and hamstrings.</Text>
        </Card>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={[Type.title, { color: Colors.text }]}>{MUSCLE_LABELS[selected]}</Text>
            <Text style={{ color: Colors.lime, fontWeight: '800' }}>
              {sets[selected]} {sets[selected] === 1 ? 'set' : 'sets'} this week
            </Text>
          </View>
          <Text style={ui.muted}>
            {sets[selected] >= 10 ? 'Well trained this week.' : `Aim for 10 to 20 hard sets a week. ${Math.max(0, 10 - sets[selected])} more to go.`}
          </Text>
          {exercises.map((e) => {
            const photo = exerciseGuide(e.name)?.photos[0];
            return (
              <Pressable key={e.name} onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: e.name } })} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
                {photo ? (
                  <Image source={{ uri: photo }} style={s.thumb} contentFit="cover" />
                ) : (
                  <View style={[s.thumb, s.thumbEmpty]}>
                    <Ionicons name="barbell" size={20} color={Colors.lime} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[ui.text, { fontWeight: '700' }]}>{e.name}</Text>
                  <Text style={ui.muted}>{e.equipment}</Text>
                </View>
                {state.activeWorkout ? (
                  <Pressable hitSlop={10} onPress={() => addToWorkout(e.name)} accessibilityLabel={`Add ${e.name} to your workout`}>
                    <Ionicons name="add-circle" size={28} color={Colors.lime} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 60 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  turn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 10, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  thumb: { width: 54, height: 54, borderRadius: Radius.sm, backgroundColor: '#ffffff' },
  thumbEmpty: { backgroundColor: Colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
});
