/**
 * Water tracker: one bottle per portion of your daily goal.
 * Tap the "+" bottle to drink one, tap a full bottle to undo.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop, ClipPath, G } from 'react-native-svg';

import { Colors, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import { Pop } from './motion';
import { Card, styles as ui } from './ui';

const BOTTLE = 'M14 2 h12 v6 c0 2 4 4 6 8 v44 c0 4 -3 6 -6 6 h-12 c-3 0 -6 -2 -6 -6 v-44 c2 -4 6 -6 6 -8 z';

function Bottle({ fill, plus }: { fill: number; plus: boolean }) {
  // fill: 0 = empty, 1 = full
  const height = 58 * Math.max(0, Math.min(1, fill));
  return (
    <Svg width={40} height={68} viewBox="0 0 40 68">
      <Defs>
        <LinearGradient id="water" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5AA9FF" />
          <Stop offset="0.6" stopColor="#2F6BFF" />
          <Stop offset="1" stopColor="#1F4FD8" />
        </LinearGradient>
        <ClipPath id="bottle">
          <Path d={BOTTLE} />
        </ClipPath>
      </Defs>
      <Path d={BOTTLE} fill="rgba(90,169,255,0.16)" stroke="rgba(90,169,255,0.45)" strokeWidth={1.5} />
      <G clipPath="url(#bottle)">
        <Rect x={0} y={66 - height} width={40} height={height} fill="url(#water)" />
        {/* light reflection */}
        {fill > 0 && <Rect x={11} y={20} width={3} height={36} rx={1.5} fill="rgba(255,255,255,0.35)" />}
      </G>
      {plus && <Path d="M20 30 v16 M12 38 h16" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />}
    </Svg>
  );
}

export function WaterCard() {
  const { state, dispatch } = useStore();
  const today = todayKey();
  const drunk = state.water[today] ?? 0;
  const goal = state.goals.waterMl;
  const size = state.settings.bottleMl;
  // Enough bottles for your goal, plus always one "+" bottle so you can drink more than the goal.
  const bottles = Math.max(1, Math.ceil(goal / size), Math.floor(drunk / size) + 1);
  const done = drunk >= goal;

  const add = (ml: number) => {
    haptics.tap();
    dispatch({ type: 'addWater', date: today, ml });
  };

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={[Type.heading, { color: Colors.text }]}>Water</Text>
          <Text style={ui.muted}>
            {(drunk / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} / {(goal / 1000).toLocaleString('en-US')} L
          </Text>
        </View>
        <Pressable hitSlop={10} onPress={() => router.push('/goals')}>
          <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>
      <View style={s.row}>
        {Array.from({ length: bottles }, (_, i) => {
          const fill = (drunk - i * size) / size;
          const isNext = fill <= 0 && (i === 0 || drunk - (i - 1) * size >= size);
          return (
            <Pressable
              key={i}
              hitSlop={4}
              onPress={() => (fill > 0 ? add(-size) : add(size))}
              accessibilityLabel={fill > 0 ? 'Remove a bottle' : 'Drink a bottle'}>
              <Pop trigger={fill > 0}>
                <Bottle fill={fill} plus={isNext} />
              </Pop>
            </Pressable>
          );
        })}
      </View>
      <Text style={ui.muted}>
        {done ? 'Goal reached — nice! 💧' : `One bottle = ${size} ml · tap + to drink, tap a full bottle to undo`}
      </Text>
    </Card>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
