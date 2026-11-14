/** How to do an exercise: the start and end photo fade into each other like a short clip, plus the steps. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Colors, Spacing, Type } from '@/constants/theme';
import { useExerciseGuide } from '@/data/exerciseGuide';
import { Card, styles as ui } from './ui';

export function ExerciseDemo({ name }: { name: string }) {
  const guide = useExerciseGuide(name);
  const [showSteps, setShowSteps] = useState(false);
  const end = useSharedValue(0);

  useEffect(() => {
    if (!guide || guide.photos.length < 2) return;
    let up = true;
    const t = setInterval(() => {
      end.value = withTiming(up ? 1 : 0, { duration: 450 });
      up = !up;
    }, 1300);
    return () => clearInterval(t);
  }, [guide, end]);

  const endStyle = useAnimatedStyle(() => ({ opacity: end.value }));
  if (!guide) return null;

  return (
    <Card style={{ gap: Spacing.md, padding: 0, overflow: 'hidden' }}>
      {guide.photos.length > 0 && (
        <View style={s.media}>
          <Image source={{ uri: guide.photos[0] }} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} />
          {guide.photos[1] && (
            <Animated.View style={[StyleSheet.absoluteFill, endStyle]}>
              <Image source={{ uri: guide.photos[1] }} style={StyleSheet.absoluteFill} contentFit="contain" />
            </Animated.View>
          )}
        </View>
      )}
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm, paddingTop: guide.photos.length ? 0 : Spacing.lg }}>
        <Pressable onPress={() => setShowSteps(!showSteps)} style={s.toggle} accessibilityRole="button">
          <Text style={[Type.heading, { color: Colors.text, flex: 1 }]}>How to do it</Text>
          <Ionicons name={showSteps ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
        </Pressable>
        {showSteps && guide.steps.length === 0 && <Text style={ui.muted}>Loading the steps.</Text>}
        {showSteps &&
          guide.steps.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={s.num}>{i + 1}</Text>
              <Text style={[ui.text, { flex: 1, lineHeight: 21 }]}>{step}</Text>
            </View>
          ))}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  media: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#FFFFFF' },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.md },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.limeSoft, color: Colors.lime, textAlign: 'center', fontWeight: '800', fontSize: 12, lineHeight: 22, overflow: 'hidden' },
});

