import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { HABITS, habitDone, habitTitle } from '@/store/logic';
import { useStore } from '@/store/store';
import type { DateKey } from '@/store/types';
import { Pop } from './motion';

/**
 * Checklist of daily habits. "Auto" habits tick themselves from your logs;
 * "manual" habits are ticked by tapping them.
 */
export function HabitList({ date }: { date: DateKey }) {
  const { state, dispatch } = useStore();

  return (
    <View style={{ gap: Spacing.sm }}>
      {HABITS.map((habit) => {
        const done = habitDone(state, date, habit.id);
        const manual = habit.kind === 'manual';
        return (
          <Pressable
            key={habit.id}
            disabled={!manual}
            onPress={() => {
              haptics.tap();
              dispatch({ type: 'toggleHabit', date, habit: habit.id });
            }}
            style={({ pressed }) => [styles.row, done && styles.rowDone, pressed && { opacity: 0.7 }]}>
            <Pop trigger={done} style={[styles.check, done && styles.checkDone]}>
              {done && <Ionicons name="checkmark" size={16} color={Colors.background} />}
            </Pop>
            <Text style={styles.title}>{habitTitle(state, habit.id)}</Text>
            <Text style={styles.kind}>{manual ? 'tap' : 'auto'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowDone: { borderColor: Colors.limeBorder, backgroundColor: '#1C2612' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  title: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' },
  kind: { color: Colors.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
