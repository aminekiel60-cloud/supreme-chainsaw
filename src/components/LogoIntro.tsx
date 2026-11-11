/**
 * App-start animation, like the concept video: the white "L" slides in,
 * the lime lock drops onto it, a glow pulses, then everything fades into the app.
 */
import { useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { LogoL, LogoLock } from './Logo';

const SIZE = 140;

// When the lock lands on the L (its drop starts at 250 ms and the spring settles ~270 ms later).
const CLICK_AT_MS = 520;

export function LogoIntro({ onDone }: { onDone: () => void }) {
  const click = useAudioPlayer(require('@/assets/sounds/lock-click.wav'));
  const lX = useSharedValue(-120);
  const lOpacity = useSharedValue(0);
  const lockY = useSharedValue(-160);
  const lockOpacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const tagline = useSharedValue(0);
  const screen = useSharedValue(1);

  useEffect(() => {
    lX.value = withSpring(0, { damping: 14, stiffness: 140 });
    lOpacity.value = withTiming(1, { duration: 250 });
    lockOpacity.value = withDelay(250, withTiming(1, { duration: 200 }));
    lockY.value = withDelay(250, withSpring(0, { damping: 9, stiffness: 160 }));
    glow.value = withDelay(650, withSequence(withTiming(1, { duration: 250 }), withTiming(0.35, { duration: 400 })));
    tagline.value = withDelay(750, withTiming(1, { duration: 300 }));
    const clickTimer = setTimeout(() => {
      haptics.lock();
      try {
        click.play();
      } catch {
        // no sound available (e.g. muted web tab): the vibration is enough
      }
    }, CLICK_AT_MS);
    screen.value = withDelay(
      1500,
      withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    return () => clearTimeout(clickTimer);
  }, [lX, lOpacity, lockY, lockOpacity, glow, tagline, screen, onDone, click]);

  const lStyle = useAnimatedStyle(() => ({ opacity: lOpacity.value, transform: [{ translateX: lX.value }] }));
  const lockStyle = useAnimatedStyle(() => ({ opacity: lockOpacity.value, transform: [{ translateY: lockY.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.8 + glow.value * 0.4 }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value, transform: [{ translateY: (1 - tagline.value) * 10 }] }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.screen, screenStyle]} pointerEvents="none">
      <View style={{ width: SIZE, height: SIZE }}>
        <Animated.View style={[s.glow, glowStyle]} />
        <Animated.View style={[StyleSheet.absoluteFill, lockStyle]}>
          <LogoLock size={SIZE} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, lStyle]}>
          <LogoL size={SIZE} />
        </Animated.View>
      </View>
      <Animated.View style={taglineStyle}>
        <Text style={s.tagline}>
          LOCK IN. <Text style={{ color: Colors.lime }}>LEVEL UP.</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen: { backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 28, zIndex: 100 },
  glow: {
    position: 'absolute',
    left: SIZE * 0.3,
    top: SIZE * 0.3,
    width: SIZE * 0.7,
    height: SIZE * 0.7,
    borderRadius: SIZE,
    backgroundColor: 'rgba(163, 255, 63, 0.05)',
    boxShadow: '0 0 60px 24px rgba(163, 255, 63, 0.45)',
    opacity: 0,
  },
  tagline: { color: Colors.text, fontWeight: '800', letterSpacing: 4, fontSize: 14 },
});
