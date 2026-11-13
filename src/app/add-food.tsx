/** ADD FOOD — manual entry or quick-add, plus placeholders for AI photo and barcode. */
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { QUICK_FOODS, type QuickFood } from '@/data/foods';
import { addDays, todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { FoodEntry, Meal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return 'Breakfast';
  if (h < 15) return 'Lunch';
  if (h < 21) return 'Dinner';
  return 'Snacks';
}

const num = (v: string) => Number(v.replace(',', '.')) || 0;

export default function AddFoodScreen() {
  const { state, dispatch } = useStore();
  // Opened from a meal's "+" or another day in the diary.
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const date = params.date ?? todayKey();
  const frequent = frequentFoods(state.food);
  const [meal, setMeal] = useState<Meal>(params.meal ?? defaultMeal());
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const add = (food: QuickFood) => {
    // Keep the base values, so the amount can be changed later.
    const base = food.base ?? { amount: 1, unit: 'serving' as const, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat };
    dispatch({ type: 'addFood', entry: { ...food, base, meal, date } });
    router.back();
  };

  const addManual = () =>
    add({ name: name.trim(), kcal: num(kcal), protein: num(protein), carbs: num(carbs), fat: num(fat) });

  return (
    <FormScroll>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {MEALS.map((m) => (
          <Chip key={m} label={m} active={meal === m} onPress={() => setMeal(m)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/photo', params: { meal, date } })}>
          <Card highlight style={{ alignItems: 'center', gap: 6 }}>
            <Ionicons name="camera" size={26} color={Colors.lime} />
            <Text style={[ui.text, { fontWeight: '700' }]}>AI photo</Text>
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/scan', params: { meal, date } })}>
          <Card highlight style={{ alignItems: 'center', gap: 6 }}>
            <Ionicons name="barcode" size={26} color={Colors.lime} />
            <Text style={[ui.text, { fontWeight: '700' }]}>Scan barcode</Text>
          </Card>
        </Pressable>
      </View>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Manual entry</SectionTitle>
        <Field label="Food" placeholder="e.g. Chicken wrap" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="kcal" keyboardType="numeric" placeholder="0" value={kcal} onChangeText={setKcal} />
          <Field label="Protein g" keyboardType="numeric" placeholder="0" value={protein} onChangeText={setProtein} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="Carbs g" keyboardType="numeric" placeholder="0" value={carbs} onChangeText={setCarbs} />
          <Field label="Fat g" keyboardType="numeric" placeholder="0" value={fat} onChangeText={setFat} />
        </View>
        <Button title={`Add to ${meal}`} icon="checkmark" disabled={!name.trim() || !kcal} onPress={addManual} />
      </Card>

      <SectionTitle
        action={
          <Pressable onPress={() => router.push('/my-food')} hitSlop={8}>
            <Text style={{ color: Colors.lime, fontWeight: '700' }}>+ Create food</Text>
          </Pressable>
        }>
        My foods
      </SectionTitle>
      {state.myFoods.length === 0 && (
        <Pressable onPress={() => router.push('/my-food')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Ionicons name="bookmark-outline" size={22} color={Colors.lime} />
            <Text style={[ui.muted, { flex: 1 }]}>Save your own recipes and favourite meals to add them in one tap. Long-press one to edit it.</Text>
          </Card>
        </Pressable>
      )}
      {state.myFoods.map((f) => (
        <FoodRow
          key={f.id}
          food={{ ...f, name: `${f.name} (${f.portion})` }}
          onPress={() => add({ name: `${f.name} (${f.portion})`, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat })}
          onLongPress={() =>
            Alert.alert(f.name, f.portion, [
              { text: 'Edit', onPress: () => router.push({ pathname: '/my-food', params: { id: f.id } }) },
              { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'removeMyFood', id: f.id }) },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
        />
      ))}

      {frequent.length > 0 && <SectionTitle>Your frequent foods</SectionTitle>}
      {frequent.map((f) => (
        <FoodRow key={`fav-${f.name}`} food={f} onPress={() => add(f)} />
      ))}

      <SectionTitle>Quick add</SectionTitle>
      {QUICK_FOODS.map((f) => (
        <FoodRow key={f.name} food={f} onPress={() => add(f)} />
      ))}
    </FormScroll>
  );
}

/** The foods you logged most in the last 30 days (2+ times), most frequent first. */
function frequentFoods(food: FoodEntry[]): QuickFood[] {
  const since = addDays(todayKey(), -30);
  const counts = new Map<string, { food: QuickFood; n: number }>();
  for (const f of food.filter((x) => x.date >= since)) {
    const key = f.name;
    const hit = counts.get(key);
    if (hit) hit.n++;
    else counts.set(key, { food: { name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, base: f.base }, n: 1 });
  }
  return [...counts.values()]
    .filter((c) => c.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((c) => c.food);
}

function FoodRow({ food, onPress, onLongPress }: { food: QuickFood; onPress: () => void; onLongPress?: () => void }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={ui.text}>{food.name}</Text>
          <Text style={ui.muted}>
            {food.kcal} kcal · P {food.protein}g · C {food.carbs}g · F {food.fat}g
          </Text>
        </View>
        <Ionicons name="add-circle" size={26} color={Colors.lime} />
      </Card>
    </Pressable>
  );
}
