/**
 * Reusable animations (react-native-reanimated):
 * - FadeInCard: content slides up and fades in, staggered by index
 * - CountUp: a number that counts to its new value
 * - Pop: briefly springs bigger when `trigger` changes (e.g. a checkmark)
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function FadeInCard({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.duration(380).delay(index * 70)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Counts from the previous value to `value` in ~600 ms. */
export function CountUp({ value, style, format = (n) => String(n) }: { value: number; style?: StyleProp<TextStyle>; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = Date.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - t0) / 600);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value]);

  return <Text style={style}>{format(shown)}</Text>;
}

/** Wraps a child that should "pop" whenever `trigger` turns true. */
export function Pop({ trigger, children, style }: { trigger: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (trigger) scale.value = withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, { damping: 6, stiffness: 220 }));
  }, [trigger, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
