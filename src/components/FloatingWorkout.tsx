/**
 * While a workout is running and you look at another screen, this pill floats
 * above everything: the rest countdown (with Skip) or the workout time.
 * Tap it to go back to your workout, so you never forget it's still on.
 */
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { cancelRestNotification, formatDuration, useNow } from '@/lib/workoutTimer';
import { useStore } from '@/store/store';

const HIDDEN_ON = ['/active-workout', '/run', '/sign-in', '/onboarding', '/exercise-picker'];

export function FloatingWorkout() {
  const { state, dispatch } = useStore();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const aw = state.activeWorkout;
  const ended = useRef<string | null>(null);

  const restLeft = aw?.restUntil ? Math.ceil((new Date(aw.restUntil).getTime() - now) / 1000) : 0;
  const resting = Boolean(aw?.restUntil) && restLeft > 0;

  // Rest finished while you were on another screen: buzz once and clear it.
  useEffect(() => {
    if (aw?.restUntil && restLeft <= 0 && ended.current !== aw.restUntil) {
      ended.current = aw.restUntil;
      haptics.success();
      dispatch({ type: 'patchActiveWorkout', changes: { restUntil: undefined, restNotificationId: undefined } });
    }
  }, [aw?.restUntil, restLeft, dispatch]);

  if (!aw || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const elapsed = Math.floor((now - new Date(aw.startedAt).getTime()) / 1000);
  // Above the tab bar on the tabs, lower on other screens.
  const onTabs = pathname === '/' || pathname === '/coach' || pathname === '/you';
  const bottom = insets.bottom + (onTabs ? 84 : 20);

  const skip = () => {
    haptics.tap();
    ended.current = aw.restUntil ?? null;
    cancelRestNotification();
    dispatch({ type: 'patchActiveWorkout', changes: { restUntil: undefined, restNotificationId: undefined } });
  };

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      <View style={[s.wrap, { bottom }]}>
        <Pressable
          onPress={() => router.push('/active-workout')}
          style={({ pressed }) => [s.pill, resting && s.pillRest, pressed && { opacity: 0.85 }]}
          accessibilityLabel={resting ? `Rest ${formatDuration(restLeft)}. Open workout` : 'Open your workout'}>
          <Ionicons name={resting ? 'timer' : 'barbell'} size={18} color={resting ? Colors.background : Colors.lime} />
          <View>
            <Text style={[s.label, resting && { color: Colors.background }]}>{resting ? 'REST' : aw.title || 'WORKOUT'}</Text>
            <Text style={[s.time, resting && { color: Colors.background }]}>{formatDuration(resting ? restLeft : elapsed)}</Text>
          </View>
        </Pressable>
        {resting && (
          <Pressable onPress={skip} style={s.skip} hitSlop={8} accessibilityLabel="Skip rest">
            <Ionicons name="play-skip-forward" size={18} color={Colors.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: '#18200F',
    borderWidth: 1,
    borderColor: Colors.limeBorder,
    boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
  },
  pillRest: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  label: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, maxWidth: 120 },
  time: { color: Colors.lime, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  skip: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardRaised, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
});
