/** Slide the knob all the way to the right to finish: no accidental taps. */
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

const KNOB = 52;

export function SlideToFinish({ onFinish, label = 'Slide to finish' }: { onFinish: () => void; label?: string }) {
  const x = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const max = Math.max(0, width - KNOB - 8);
  const maxRef = useRef(0);
  maxRef.current = max;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(maxRef.current, g.dx))),
      onPanResponderRelease: (_, g) => {
        if (g.dx >= maxRef.current * 0.85) {
          haptics.success();
          Animated.timing(x, { toValue: maxRef.current, duration: 120, useNativeDriver: false }).start(() => {
            finishRef.current();
            x.setValue(0);
          });
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 8 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(),
    }),
  ).current;

  const fill = x.interpolate({ inputRange: [0, Math.max(1, max)], outputRange: [KNOB + 8, Math.max(KNOB + 8, width)], extrapolate: 'clamp' });
  const labelOpacity = x.interpolate({ inputRange: [0, Math.max(1, max * 0.6)], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={s.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel={label} accessibilityHint="Drag the round button to the right to finish the workout">
      <Animated.View style={[s.fill, { width: fill }]} />
      <Animated.Text style={[s.label, { opacity: labelOpacity }]}>{label}</Animated.Text>
      <Animated.View {...pan.panHandlers} style={[s.knob, { transform: [{ translateX: x }] }]} accessibilityLabel="Finish slider">
        <Ionicons name="chevron-forward" size={26} color={Colors.background} />
      </Animated.View>
      <View pointerEvents="none" style={s.flag}>
        <Ionicons name="flag" size={18} color={Colors.textMuted} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: KNOB + 8, borderRadius: Radius.pill, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.limeBorder, justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.limeSoft, borderRadius: Radius.pill },
  label: { position: 'absolute', alignSelf: 'center', color: Colors.text, fontWeight: '800', fontSize: 16 },
  knob: { position: 'absolute', left: 4, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  flag: { position: 'absolute', right: 20 },
});

