/** "Workout in progress" bar shown on Home and Train while a live workout is running. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatDuration, useNow } from '@/lib/workoutTimer';
import { useStore } from '@/store/store';
import { styles as ui } from './ui';

export function ActiveWorkoutBanner() {
  const { state } = useStore();
  const now = useNow();
  const aw = state.activeWorkout;
  if (!aw) return null;
  const elapsed = Math.floor((now - new Date(aw.startedAt).getTime()) / 1000);
  const done = aw.exercises.reduce((t, e) => t + e.sets.filter((x) => x.done).length, 0);

  return (
    <Pressable onPress={() => router.push('/active-workout')} style={s.bar}>
      <View style={s.pulse}>
        <Ionicons name="barbell" size={18} color={Colors.background} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: Colors.text, fontWeight: '800' }}>{aw.title || 'Workout'} in progress</Text>
        <Text style={ui.muted}>
          {done} sets done · {aw.exercises.length} exercises
        </Text>
      </View>
      <Text style={[s.time, { fontVariant: ['tabular-nums'] }]}>{formatDuration(elapsed)}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.lime} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: '#18200F',
    borderWidth: 1,
    borderColor: Colors.limeBorder,
  },
  pulse: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  time: { color: Colors.lime, fontWeight: '900', fontSize: 18 },
});
