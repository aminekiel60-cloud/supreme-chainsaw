/** EDIT TODAY: choose which cards Today shows and in which order. */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { StackPage } from '@/components/layout';
import { Button, Card, styles as ui, type IconName } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useStore } from '@/store/store';

const CARDS: Record<string, { label: string; detail: string; icon: IconName }> = {
  exercise: { label: 'Exercise days', detail: 'Training days this week', icon: 'barbell' },
  food: { label: 'Food', detail: 'Calories left, macros, meals', icon: 'restaurant' },
  water: { label: 'Water', detail: 'Bottles for today', icon: 'water' },
  habits: { label: 'Daily habits', detail: 'Your habits checklist', icon: 'checkmark-done' },
  recovery: { label: 'Recovery', detail: 'Sleep, heart rate, readiness', icon: 'pulse' },
  streak: { label: 'Streak and points', detail: 'Two small tiles', icon: 'flame' },
};
const DEFAULT = ['exercise', 'food', 'water', 'habits', 'recovery', 'streak'];

export default function TodayCardsScreen() {
  const { state, dispatch } = useStore();
  const { settings } = state;
  // Cards added in a later version go at the end.
  const order = [...settings.todayCards, ...DEFAULT.filter((c) => !settings.todayCards.includes(c))];

  const save = (todayCards: string[], todayHidden = settings.todayHidden) => dispatch({ type: 'setSettings', settings: { ...settings, todayCards, todayHidden } });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    haptics.tap();
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  };
  const toggle = (id: string, on: boolean) => save(order, on ? settings.todayHidden.filter((c) => c !== id) : [...settings.todayHidden, id]);

  return (
    <StackPage>
      <Text style={ui.muted}>The rings and quick buttons always stay at the top. Below them, pick the cards you want and their order.</Text>
      <Card style={{ padding: 0 }}>
        {order.map((id, i) => {
          const c = CARDS[id];
          if (!c) return null;
          const on = !settings.todayHidden.includes(id);
          return (
            <View key={id} style={[s.row, i < order.length - 1 && s.border]}>
              <View style={s.icon}>
                <Ionicons name={c.icon} size={18} color={on ? Colors.lime : Colors.textFaint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontWeight: '700' }, !on && { color: Colors.textMuted }]}>{c.label}</Text>
                <Text style={ui.muted}>{c.detail}</Text>
              </View>
              <Pressable hitSlop={8} onPress={() => move(i, -1)} disabled={i === 0} accessibilityLabel={`Move ${c.label} up`}>
                <Ionicons name="chevron-up" size={22} color={i === 0 ? Colors.textFaint : Colors.text} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => move(i, 1)} disabled={i === order.length - 1} accessibilityLabel={`Move ${c.label} down`}>
                <Ionicons name="chevron-down" size={22} color={i === order.length - 1 ? Colors.textFaint : Colors.text} />
              </Pressable>
              <Switch value={on} onValueChange={(v) => toggle(id, v)} trackColor={{ true: Colors.lime, false: Colors.border }} thumbColor={Colors.text} accessibilityLabel={`Show ${c.label}`} />
            </View>
          );
        })}
      </Card>
      <Button title="Back to the default" icon="refresh" variant="ghost" onPress={() => save(DEFAULT, [])} />
    </StackPage>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  icon: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
});
