/** ADD FOOD — manual entry or quick-add, plus placeholders for AI photo and barcode. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

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
  const frequent = frequentFoods(state.food);
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const add = (food: QuickFood) => {
    dispatch({ type: 'addFood', entry: { ...food, meal, date: todayKey() } });
    router.back();
  };

  const addManual = () =>
    add({ name: name.trim(), kcal: num(kcal), protein: num(protein), carbs: num(carbs), fat: num(fat) });

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {MEALS.map((m) => (
          <Chip key={m} label={m} active={meal === m} onPress={() => setMeal(m)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/photo', params: { meal } })}>
          <Card highlight style={{ alignItems: 'center', gap: 6 }}>
            <Ionicons name="camera" size={26} color={Colors.lime} />
            <Text style={[ui.text, { fontWeight: '700' }]}>AI photo</Text>
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/scan', params: { meal } })}>
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

      {frequent.length > 0 && <SectionTitle>Your frequent foods</SectionTitle>}
      {frequent.map((f) => (
        <FoodRow key={`fav-${f.name}`} food={f} onPress={() => add(f)} />
      ))}

      <SectionTitle>Quick add</SectionTitle>
      {QUICK_FOODS.map((f) => (
        <FoodRow key={f.name} food={f} onPress={() => add(f)} />
      ))}
    </ScrollView>
  );
}

/** The foods you logged most in the last 30 days (2+ times), most frequent first. */
function frequentFoods(food: FoodEntry[]): QuickFood[] {
  const since = addDays(todayKey(), -30);
  const counts = new Map<string, { food: QuickFood; n: number }>();
  for (const f of food.filter((x) => x.date >= since)) {
    const key = `${f.name}|${f.kcal}`;
    const hit = counts.get(key);
    if (hit) hit.n++;
    else counts.set(key, { food: { name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }, n: 1 });
  }
  return [...counts.values()]
    .filter((c) => c.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((c) => c.food);
}

function FoodRow({ food, onPress }: { food: QuickFood; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
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
