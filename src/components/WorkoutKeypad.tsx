/**
 * The workout's own number pad, so the phone keyboard never jumps up between
 * sets. Digits, a decimal point, delete, plus/minus one step, and Next.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

export type KeypadField = 'weight' | 'reps' | 'seconds' | 'meters';

export const FIELD_LABEL: Record<KeypadField, string> = { weight: 'Weight', reps: 'Reps', seconds: 'Seconds', meters: 'Metres' };

export function WorkoutKeypad({
  label,
  draft,
  step,
  decimals,
  onKey,
  onStep,
  onNext,
  onDone,
}: {
  label: string;
  draft: string;
  /** Size of one +/- step, e.g. 2.5 (kg), 5 (lb) or 1 (reps) */
  step: number;
  decimals: boolean;
  onKey: (key: string) => void;
  onStep: (delta: number) => void;
  onNext: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const press = (fn: () => void) => () => {
    haptics.tap();
    fn();
  };
  const key = (k: string, content?: React.ReactNode, a11y?: string) => (
    <Pressable
      key={k}
      onPress={press(() => onKey(k))}
      style={({ pressed }) => [s.key, pressed && s.keyPressed]}
      accessibilityLabel={a11y ?? `Key ${k}`}
      disabled={k === '.' && !decimals}>
      {content ?? <Text style={[s.keyText, k === '.' && !decimals && { color: Colors.textFaint }]}>{k}</Text>}
    </Pressable>
  );

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={s.top}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.draft}>{draft || ' '}</Text>
        <Pressable onPress={press(onDone)} hitSlop={10} accessibilityLabel="Close number pad">
          <Ionicons name="chevron-down" size={24} color={Colors.textMuted} />
        </Pressable>
      </View>
      <View style={s.grid}>
        <View style={s.digits}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => key(k))}
          {key('.')}
          {key('0')}
          {key('del', <Ionicons name="backspace-outline" size={24} color={Colors.text} />, 'Delete')}
        </View>
        <View style={s.side}>
          <Pressable onPress={press(() => onStep(step))} style={({ pressed }) => [s.key, s.sideKey, pressed && s.keyPressed]} accessibilityLabel={`Plus ${step}`}>
            <Text style={s.stepText}>+{step}</Text>
          </Pressable>
          <Pressable onPress={press(() => onStep(-step))} style={({ pressed }) => [s.key, s.sideKey, pressed && s.keyPressed]} accessibilityLabel={`Minus ${step}`}>
            <Text style={s.stepText}>−{step}</Text>
          </Pressable>
          <Pressable onPress={press(onNext)} style={({ pressed }) => [s.key, s.sideKey, s.next, pressed && { opacity: 0.8 }]} accessibilityLabel="Next">
            <Text style={[s.stepText, { color: Colors.background }]}>Next</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: '#0B0B0B', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, paddingHorizontal: 8, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  label: { color: Colors.textMuted, fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  draft: { flex: 1, color: Colors.lime, fontSize: 22, fontWeight: '900', textAlign: 'right', fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', gap: 8 },
  digits: { flex: 3, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  side: { flex: 1, gap: 6 },
  key: { width: '31.5%', height: 52, borderRadius: Radius.sm, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  keyPressed: { backgroundColor: Colors.cardRaised },
  keyText: { color: Colors.text, fontSize: 24, fontWeight: '700' },
  sideKey: { width: '100%' },
  stepText: { color: Colors.lime, fontSize: 18, fontWeight: '900' },
  next: { flex: 1, backgroundColor: Colors.lime, height: undefined },
});
