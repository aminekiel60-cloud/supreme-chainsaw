/** GROCERY LIST: type what you need, tick it off in the shop. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { newId } from '@/store/logic';
import { useStore } from '@/store/store';

export default function GroceryScreen() {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const open = state.grocery.filter((g) => !g.done);
  const done = state.grocery.filter((g) => g.done);

  const add = () => {
    const items = text
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    haptics.tap();
    dispatch({ type: 'apply', change: (s) => ({ grocery: [...s.grocery, ...items.map((t) => ({ id: newId(), text: t, done: false }))] }) });
    setText('');
  };

  const toggle = (id: string) => {
    haptics.tap();
    dispatch({ type: 'apply', change: (s) => ({ grocery: s.grocery.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) }) });
  };

  return (
    <FormScroll>
      <View style={s.inputRow}>
        <TextInput
          style={[ui.input, { flex: 1 }]}
          placeholder="Add items, e.g. eggs, oats, chicken"
          placeholderTextColor={Colors.textFaint}
          value={text}
          onChangeText={setText}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable style={s.addBtn} onPress={add} accessibilityLabel="Add to list">
          <Ionicons name="add" size={26} color={Colors.background} />
        </Pressable>
      </View>

      {state.savedMeals.length > 0 && (
        <Pressable onPress={() => router.push('/meals')}>
          <Text style={{ color: Colors.lime, fontWeight: '700' }}>Add the ingredients of a saved meal</Text>
        </Pressable>
      )}

      {open.length === 0 && done.length === 0 && (
        <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: 28 }}>
          <Ionicons name="cart-outline" size={38} color={Colors.textFaint} />
          <Text style={[ui.muted, { textAlign: 'center' }]}>Your list is empty. Add a few things above. Separate items with a comma.</Text>
        </Card>
      )}

      {open.length > 0 && (
        <Card style={{ padding: 0 }}>
          {open.map((g, i) => (
            <Item key={g.id} text={g.text} done={false} last={i === open.length - 1} onPress={() => toggle(g.id)} />
          ))}
        </Card>
      )}

      {done.length > 0 && (
        <>
          <Text style={ui.statLabel}>IN YOUR BASKET ({done.length})</Text>
          <Card style={{ padding: 0 }}>
            {done.map((g, i) => (
              <Item key={g.id} text={g.text} done last={i === done.length - 1} onPress={() => toggle(g.id)} />
            ))}
          </Card>
          <Button title="Clear ticked items" icon="trash-outline" variant="ghost" onPress={() => dispatch({ type: 'apply', change: (s) => ({ grocery: s.grocery.filter((g) => !g.done) }) })} />
        </>
      )}
    </FormScroll>
  );
}

function Item({ text, done, last, onPress }: { text: string; done: boolean; last: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.item, !last && s.border]} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
      <View style={[s.check, done && s.checkDone]}>{done && <Ionicons name="checkmark" size={16} color={Colors.background} />}</View>
      <Text style={[ui.text, { flex: 1 }, done && { color: Colors.textMuted, textDecorationLine: 'line-through' }]}>{text}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  inputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  check: { width: 24, height: 24, borderRadius: Radius.pill, borderWidth: 2, borderColor: Colors.textFaint, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: Colors.lime, borderColor: Colors.lime },
});
