/**
 * App-start animation, after the concept video:
 * lime particles drift in the dark, rings draw in, the white "L" flies in,
 * the lime lock drops and snaps shut with a click, a flash and a shockwave,
 * then the "Locked in" wordmark and tagline appear. Tap anywhere to skip.
 */
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { LogoL, LogoLock } from './Logo';

const SIZE = 132;
const PARTICLES = 22;

// Timeline (ms)
const L_IN = 150;
const LOCK_DROP = 480;
const CLICK = 760; // the lock lands
const WORDMARK = 980;
const TAGLINE = 1250;
const FADE_OUT = 2150;

export function LogoIntro({ onDone }: { onDone: () => void }) {
  const click = useAudioPlayer(require('@/assets/sounds/lock-click.wav'));
  const rings = useSharedValue(0);
  const lX = useSharedValue(-180);
  const lRotate = useSharedValue(-25);
  const lOpacity = useSharedValue(0);
  const lockY = useSharedValue(-220);
  const lockOpacity = useSharedValue(0);
  const logoScale = useSharedValue(1);
  const flash = useSharedValue(0);
  const shock = useSharedValue(0);
  const glow = useSharedValue(0);
  const word = useSharedValue(0);
  const tagline = useSharedValue(0);
  const screen = useSharedValue(1);

  useEffect(() => {
    rings.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });

    lOpacity.value = withDelay(L_IN, withTiming(1, { duration: 220 }));
    lX.value = withDelay(L_IN, withSpring(0, { damping: 13, stiffness: 120 }));
    lRotate.value = withDelay(L_IN, withSpring(0, { damping: 12, stiffness: 110 }));

    lockOpacity.value = withDelay(LOCK_DROP, withTiming(1, { duration: 140 }));
    lockY.value = withDelay(LOCK_DROP, withTiming(0, { duration: CLICK - LOCK_DROP, easing: Easing.in(Easing.quad) }));

    // The snap: a quick squash, a flash, a shockwave ring and a lasting glow.
    logoScale.value = withDelay(CLICK, withSequence(withTiming(0.92, { duration: 70 }), withSpring(1, { damping: 7, stiffness: 240 })));
    flash.value = withDelay(CLICK, withSequence(withTiming(0.55, { duration: 60 }), withTiming(0, { duration: 420 })));
    shock.value = withDelay(CLICK, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    glow.value = withDelay(CLICK, withSequence(withTiming(1, { duration: 180 }), withTiming(0.45, { duration: 600 })));

    word.value = withDelay(WORDMARK, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    tagline.value = withDelay(TAGLINE, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));

    const clickTimer = setTimeout(() => {
      haptics.lock();
      try {
        click.play();
      } catch {
        // no sound available: the vibration is enough
      }
    }, CLICK);

    screen.value = withDelay(
      FADE_OUT,
      withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    return () => clearTimeout(clickTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.value }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: rings.value * 0.5, transform: [{ scale: 0.7 + rings.value * 0.3 }] }));
  const ring2Style = useAnimatedStyle(() => ({ opacity: rings.value * 0.25, transform: [{ scale: 0.6 + rings.value * 0.4 }, { rotate: `${rings.value * 40}deg` }] }));
  const lStyle = useAnimatedStyle(() => ({ opacity: lOpacity.value, transform: [{ translateX: lX.value }, { rotate: `${lRotate.value}deg` }] }));
  const lockStyle = useAnimatedStyle(() => ({ opacity: lockOpacity.value, transform: [{ translateY: lockY.value }] }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const shockStyle = useAnimatedStyle(() => ({ opacity: (1 - shock.value) * 0.9, transform: [{ scale: 0.4 + shock.value * 2.4 }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.85 + glow.value * 0.3 }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 14 }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value, letterSpacing: 2 + tagline.value * 3 }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.screen, screenStyle]}>
      <Pressable style={[StyleSheet.absoluteFill, s.center]} onPress={onDone} accessibilityLabel="Skip intro">
        {Array.from({ length: PARTICLES }, (_, i) => (
          <Particle key={i} index={i} />
        ))}

        <View style={s.stage}>
          <Animated.View style={[s.ring, s.ringOuter, ring2Style]} />
          <Animated.View style={[s.ring, ringStyle]} />
          <Animated.View style={[s.shock, shockStyle]} />
          <Animated.View style={[s.glow, glowStyle]} />
          <Animated.View style={[{ width: SIZE, height: SIZE }, logoStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, lockStyle]}>
              <LogoLock size={SIZE} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, lStyle]}>
              <LogoL size={SIZE} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View style={wordStyle}>
          <Text style={s.word}>
            Locked <Text style={{ color: Colors.lime }}>in</Text>
          </Text>
        </Animated.View>
        <Animated.Text style={[s.tagline, taglineStyle]}>
          LOCK IN. <Text style={{ color: Colors.lime }}>LEVEL UP.</Text>
        </Animated.Text>

        <Animated.View style={[StyleSheet.absoluteFill, s.flash, flashStyle]} pointerEvents="none" />
      </Pressable>
    </Animated.View>
  );
}

/** A small glowing dot that drifts upward and twinkles. */
function Particle({ index }: { index: number }) {
  const { width, height } = useWindowDimensions();
  const p = useMemo(
    () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 2 + Math.random() * 3,
      drift: 30 + Math.random() * 60,
      duration: 1800 + Math.random() * 1600,
      delay: Math.random() * 600,
      lime: index % 3 !== 0,
    }),
    [index, width, height],
  );
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(p.delay, withRepeat(withTiming(1, { duration: p.duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t, p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.15 + t.value * 0.7, transform: [{ translateY: -p.drift * t.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, borderRadius: p.size, backgroundColor: p.lime ? Colors.lime : '#FFFFFF' },
        style,
      ]}
    />
  );
}

const s = StyleSheet.create({
  screen: { backgroundColor: '#0B0B0B', zIndex: 100 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 18 },
  stage: { width: SIZE * 2.4, height: SIZE * 2.4, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: SIZE * 1.9,
    height: SIZE * 1.9,
    borderRadius: SIZE,
    borderWidth: 1.5,
    borderColor: Colors.lime,
  },
  ringOuter: { width: SIZE * 2.35, height: SIZE * 2.35, borderRadius: SIZE * 1.2, borderStyle: 'dashed', borderWidth: 1 },
  shock: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE, borderWidth: 3, borderColor: Colors.lime },
  glow: {
    position: 'absolute',
    width: SIZE * 0.9,
    height: SIZE * 0.9,
    borderRadius: SIZE,
    backgroundColor: 'rgba(163, 255, 63, 0.06)',
    boxShadow: '0 0 70px 30px rgba(163, 255, 63, 0.45)',
  },
  word: { color: Colors.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  tagline: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  flash: { backgroundColor: '#D9FFA8' },
});
