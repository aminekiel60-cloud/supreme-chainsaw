/** ADD FOOD — manual entry or quick-add, plus placeholders for AI photo and barcode. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { QUICK_FOODS, type QuickFood } from '@/data/foods';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

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
  const { dispatch } = useStore();
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

      <SectionTitle>Quick add</SectionTitle>
      {QUICK_FOODS.map((f) => (
        <Pressable key={f.name} onPress={() => add(f)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{f.name}</Text>
              <Text style={ui.muted}>
                {f.kcal} kcal · P {f.protein}g · C {f.carbs}g · F {f.fat}g
              </Text>
            </View>
            <Ionicons name="add-circle" size={26} color={Colors.lime} />
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
