/**
 * Celebration overlay: the lock springs in with a glow and lime confetti bursts out.
 * Shown when you lock in your day (60%+) or complete every habit (100%).
 */
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { LogoMark } from './Logo';

export type CelebrationKind = 'lockedIn' | 'perfect';

const PIECES = 28;
const CONFETTI_COLORS = [Colors.lime, '#C8FF7A', '#FFFFFF', Colors.carbs];

export function Celebration({ kind, onDone }: { kind: CelebrationKind; onDone: () => void }) {
  const scale = useSharedValue(0.3);
  const glow = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 160 });
    glow.value = withSequence(withTiming(1, { duration: 300 }), withTiming(0.4, { duration: 700 }));
    const timer = setTimeout(onDone, 2400);
    return () => clearTimeout(timer);
  }, [scale, glow, onDone]);

  const lockStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.6 + glow.value * 0.6 }] }));

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, s.backdrop]}>
      <Pressable style={[StyleSheet.absoluteFill, s.center]} onPress={onDone}>
        {Array.from({ length: PIECES }, (_, i) => (
          <Confetti key={i} index={i} />
        ))}
        <View style={s.center}>
          <Animated.View style={[s.glow, glowStyle]} />
          <Animated.View style={lockStyle}>
            <LogoMark size={120} />
          </Animated.View>
        </View>
        <Animated.Text entering={FadeIn.delay(250)} style={s.title}>
          {kind === 'perfect' ? '100% — PERFECT DAY' : 'LOCKED IN 🔒'}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(400)} style={s.subtitle}>
          {kind === 'perfect' ? 'Every habit done. Legendary.' : 'Your day counts towards your streak.'}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

/** One confetti piece: flies out from the centre, spins, and falls. */
function Confetti({ index }: { index: number }) {
  const { width } = useWindowDimensions();
  // Fixed per piece so it doesn't change on re-render.
  const p = useMemo(() => {
    const angle = (index / PIECES) * Math.PI * 2 + Math.random() * 0.4;
    const distance = width * (0.25 + Math.random() * 0.3);
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - 60,
      spin: (Math.random() - 0.5) * 720,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 8,
    };
  }, [index, width]);

  const t = useSharedValue(0);
  const fall = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    fall.value = withDelay(500, withTiming(1, { duration: 1500, easing: Easing.in(Easing.quad) }));
  }, [t, fall]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - fall.value,
    transform: [
      { translateX: p.dx * t.value },
      { translateY: p.dy * t.value + fall.value * 260 },
      { rotate: `${p.spin * (t.value + fall.value)}deg` },
    ],
  }));

  return <Animated.View style={[s.piece, { width: p.w, height: p.h, backgroundColor: p.color }, style]} />;
}

const s = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 90 },
  center: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.limeSoft,
    boxShadow: '0 0 70px 30px rgba(163, 255, 63, 0.4)',
  },
  title: { color: Colors.lime, fontSize: 24, fontWeight: '900', letterSpacing: 2, marginTop: 28 },
  subtitle: { color: Colors.text, fontSize: 15, marginTop: 8 },
  piece: { position: 'absolute', borderRadius: 2 },
});
