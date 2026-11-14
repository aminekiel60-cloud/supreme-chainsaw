/**
 * SAVED MEALS and RECIPES: foods you eat together, logged in one tap.
 * Save a meal straight from your diary. A recipe is a saved meal with more
 * than one serving: logging it adds one serving.
 */
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Pill } from '@/components/layout';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { todayKey } from '@/store/dates';
import { newId } from '@/store/logic';
import { useStore } from '@/store/store';
import type { Meal, SavedMeal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

function totals(m: SavedMeal) {
  const t = m.items.reduce((a, f) => ({ kcal: a.kcal + f.kcal, protein: a.protein + f.protein, carbs: a.carbs + f.carbs, fat: a.fat + f.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const per = Math.max(1, m.servings);
  return { kcal: t.kcal / per, protein: t.protein / per, carbs: t.carbs / per, fat: t.fat / per };
}

export default function MealsScreen() {
  const params = useLocalSearchParams<{ meal?: Meal; date?: string; from?: Meal }>();
  const { state, dispatch } = useStore();
  const date = params.date ?? todayKey();
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'Lunch');
  const [from, setFrom] = useState<Meal | null>(params.from ?? null);
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');

  const fromItems = from ? state.food.filter((f) => f.date === date && f.meal === from) : [];

  const save = () => {
    const n = Math.max(1, Math.round(Number(servings) || 1));
    if (!name.trim() || fromItems.length === 0) return;
    haptics.success();
    dispatch({
      type: 'apply',
      change: (s) => ({
        savedMeals: [
          ...s.savedMeals,
          { id: newId(), name: name.trim(), servings: n, items: fromItems.map((f) => ({ name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })) },
        ],
      }),
    });
    setName('');
    setFrom(null);
    setServings('1');
  };

  const log = (m: SavedMeal) => {
    haptics.add();
    if (m.servings > 1) {
      const t = totals(m);
      dispatch({ type: 'addFood', entry: { name: `${m.name} (1 of ${m.servings} servings)`, ...t, meal, date } });
    } else {
      for (const f of m.items) dispatch({ type: 'addFood', entry: { ...f, meal, date } });
    }
    router.back();
  };

  const remove = (m: SavedMeal) =>
    Alert.alert(`Delete ${m.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'apply', change: (s) => ({ savedMeals: s.savedMeals.filter((x) => x.id !== m.id) }) }) },
    ]);

  const toGrocery = (m: SavedMeal) => {
    dispatch({
      type: 'apply',
      change: (s) => ({
        grocery: [...s.grocery, ...m.items.filter((f) => !s.grocery.some((g) => !g.done && g.text === f.name)).map((f) => ({ id: newId(), text: f.name, done: false }))],
      }),
    });
    Alert.alert('Added to your grocery list', `${m.items.length} ${m.items.length === 1 ? 'item' : 'items'} from ${m.name}.`);
  };

  return (
    <FormScroll>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Save a meal from your diary</SectionTitle>
        <Text style={ui.muted}>Pick a meal you logged. It becomes one tap next time.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {MEALS.map((m) => {
            const n = state.food.filter((f) => f.date === date && f.meal === m).length;
            return n > 0 ? <Chip key={m} label={`${m} (${n})`} active={from === m} onPress={() => setFrom(from === m ? null : m)} /> : null;
          })}
          {!MEALS.some((m) => state.food.some((f) => f.date === date && f.meal === m)) && <Text style={ui.muted}>Nothing logged on this day yet.</Text>}
        </View>
        {from && (
          <>
            {fromItems.map((f) => (
              <Text key={f.id} style={ui.text}>
                {f.name} <Text style={ui.muted}>{Math.round(f.kcal)} kcal</Text>
              </Text>
            ))}
            <Field label="Name" placeholder="e.g. Overnight oats" value={name} onChangeText={setName} />
            <Field label="Servings (for a recipe you cook in bulk)" keyboardType="number-pad" value={servings} onChangeText={setServings} />
            <Button title="Save meal" icon="bookmark" disabled={!name.trim()} onPress={save} />
          </>
        )}
      </Card>

      <SectionTitle>Log a saved meal to</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {MEALS.map((m) => (
          <Chip key={m} label={m} active={meal === m} onPress={() => setMeal(m)} />
        ))}
      </View>

      {state.savedMeals.length === 0 && (
        <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: 24 }}>
          <Ionicons name="bookmark-outline" size={34} color={Colors.textFaint} />
          <Text style={[ui.muted, { textAlign: 'center' }]}>No saved meals yet. Log your breakfast once, then save it above.</Text>
        </Card>
      )}
      {state.savedMeals.map((m) => {
        const t = totals(m);
        return (
          <Card key={m.id} style={{ gap: Spacing.sm }}>
            <Pressable onPress={() => log(m)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }} accessibilityLabel={`Log ${m.name}`}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[ui.text, { fontWeight: '800' }]}>{m.name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <Pill text={`${Math.round(t.kcal)} kcal`} />
                  <Pill text={`P ${Math.round(t.protein)} g`} />
                  {m.servings > 1 && <Pill icon="people" text={`${m.servings} servings`} />}
                </View>
              </View>
              <View style={s.add}>
                <Ionicons name="add" size={22} color={Colors.background} />
              </View>
            </Pressable>
            <Text style={ui.muted} numberOfLines={2}>
              {m.items.map((f) => f.name).join(', ')}
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
              <Pressable onPress={() => toGrocery(m)} hitSlop={8}>
                <Text style={{ color: Colors.lime, fontWeight: '700' }}>Add to grocery list</Text>
              </Pressable>
              <Pressable onPress={() => remove(m)} hitSlop={8}>
                <Text style={{ color: Colors.danger, fontWeight: '700' }}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </FormScroll>
  );
}

const s = StyleSheet.create({
  add: { width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
});
