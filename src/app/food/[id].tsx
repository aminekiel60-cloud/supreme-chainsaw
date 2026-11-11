/** EDIT FOOD — change an entry you already logged: amount, values, meal, or delete it. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const AMOUNTS = [0.5, 0.75, 1, 1.5, 2];
const num = (v: string) => Number(v.replace(',', '.'));
const round1 = (n: number) => Math.round(n * 10) / 10;

export default function EditFoodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const entry = state.food.find((f) => f.id === id);
  const [name, setName] = useState(entry?.name ?? '');
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? 'Snacks');
  const [amount, setAmount] = useState(1);
  const [kcal, setKcal] = useState(String(entry?.kcal ?? ''));
  const [protein, setProtein] = useState(String(entry?.protein ?? ''));
  const [carbs, setCarbs] = useState(String(entry?.carbs ?? ''));
  const [fat, setFat] = useState(String(entry?.fat ?? ''));

  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={ui.muted}>This entry was deleted.</Text>
      </View>
    );
  }

  const values = [kcal, protein, carbs, fat].map(num);
  const valid = name.trim().length > 0 && values.every((v) => Number.isFinite(v) && v >= 0);
  const scaled = values.map((v) => round1(v * amount));

  const save = () => {
    dispatch({
      type: 'updateFood',
      id: entry.id,
      changes: { name: name.trim(), meal, kcal: Math.round(scaled[0]), protein: scaled[1], carbs: scaled[2], fat: scaled[3] },
    });
    router.back();
  };

  const remove = () =>
    Alert.alert('Delete this entry?', entry.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'removeFood', id: entry.id });
          router.back();
        },
      },
    ]);

  return (
    <FormScroll>
      <Card style={{ gap: Spacing.md }}>
        <Field label="Food" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {MEALS.map((m) => (
            <Chip key={m} label={m} active={meal === m} onPress={() => setMeal(m)} />
          ))}
        </View>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Amount</SectionTitle>
        <Text style={ui.muted}>Ate more or less than logged? Scale the whole entry.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {AMOUNTS.map((a) => (
            <Chip key={a} label={`${a}×`} active={amount === a} onPress={() => setAmount(a)} />
          ))}
        </View>
        <Text style={{ color: Colors.lime, fontWeight: '800', fontSize: 18 }}>
          {Math.round(scaled[0])} kcal · P {scaled[1]}g · C {scaled[2]}g · F {scaled[3]}g
        </Text>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Values (for 1×)</SectionTitle>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="kcal" keyboardType="decimal-pad" value={kcal} onChangeText={setKcal} />
          <Field label="Protein g" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="Carbs g" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} />
          <Field label="Fat g" keyboardType="decimal-pad" value={fat} onChangeText={setFat} />
        </View>
      </Card>

      <Button title="Save changes" icon="checkmark" disabled={!valid} onPress={save} />
      <Pressable onPress={remove} style={{ padding: 12 }}>
        <Text style={{ color: Colors.danger, textAlign: 'center', fontWeight: '600' }}>Delete entry</Text>
      </Pressable>
    </FormScroll>
  );
}
