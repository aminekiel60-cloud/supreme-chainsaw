/** EDIT FOOD — change how much you ate, the meal or the values of an entry, or delete it. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { baseOf, fromBase } from '@/store/logic';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const num = (v: string) => Number(v.replace(',', '.'));

export default function EditFoodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const entry = state.food.find((f) => f.id === id);
  const start = entry ? baseOf(entry) : null;
  const [name, setName] = useState(entry?.name ?? '');
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? 'Snacks');
  const [amount, setAmount] = useState(start ? String(start.amount) : '1');
  const [showValues, setShowValues] = useState(false);
  const [kcal, setKcal] = useState(String(start?.kcal ?? ''));
  const [protein, setProtein] = useState(String(start?.protein ?? ''));
  const [carbs, setCarbs] = useState(String(start?.carbs ?? ''));
  const [fat, setFat] = useState(String(start?.fat ?? ''));

  if (!entry || !start) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={ui.muted}>This entry was deleted.</Text>
      </View>
    );
  }

  const grams = start.unit === 'g';
  const values = [kcal, protein, carbs, fat].map(num);
  const qty = num(amount);
  const valid = name.trim().length > 0 && qty > 0 && values.every((v) => Number.isFinite(v) && v >= 0);
  const base = { unit: start.unit, kcal: values[0] || 0, protein: values[1] || 0, carbs: values[2] || 0, fat: values[3] || 0 };
  const totals = fromBase(base, qty > 0 ? qty : 0);
  const quick = grams ? [50, 100, 150, 200, 250] : [0.5, 1, 1.5, 2, 3];

  const save = () => {
    dispatch({ type: 'updateFood', id: entry.id, changes: { name: name.trim(), meal, ...totals, base: { ...base, amount: qty } } });
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
        <SectionTitle>How much did you eat?</SectionTitle>
        <Field
          label={grams ? 'Grams' : 'Servings'}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          selectTextOnFocus
          accessibilityLabel="Amount"
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {quick.map((a) => (
            <Chip key={a} label={grams ? `${a} g` : `${a}×`} active={qty === a} onPress={() => setAmount(String(a))} />
          ))}
        </View>
        <Text style={{ color: Colors.lime, fontWeight: '800', fontSize: 18 }}>
          {totals.kcal} kcal, {totals.protein} g protein, {totals.carbs} g carbs, {totals.fat} g fat
        </Text>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <Field label="Food" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {MEALS.map((m) => (
            <Chip key={m} label={m} active={meal === m} onPress={() => setMeal(m)} />
          ))}
        </View>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle
          action={
            <Pressable onPress={() => setShowValues(!showValues)} hitSlop={8}>
              <Text style={{ color: Colors.lime, fontWeight: '700' }}>{showValues ? 'Hide' : 'Edit'}</Text>
            </Pressable>
          }>
          Values {grams ? 'per 100 g' : 'per serving'}
        </SectionTitle>
        {showValues ? (
          <>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Field label="kcal" keyboardType="decimal-pad" value={kcal} onChangeText={setKcal} />
              <Field label="Protein g" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} />
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Field label="Carbs g" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} />
              <Field label="Fat g" keyboardType="decimal-pad" value={fat} onChangeText={setFat} />
            </View>
          </>
        ) : (
          <Text style={ui.muted}>
            {base.kcal} kcal, {base.protein} g protein, {base.carbs} g carbs, {base.fat} g fat
          </Text>
        )}
      </Card>

      <Button title="Save changes" icon="checkmark" disabled={!valid} onPress={save} />
      <Pressable onPress={remove} style={{ padding: 12 }}>
        <Text style={{ color: Colors.danger, textAlign: 'center', fontWeight: '600' }}>Delete entry</Text>
      </Pressable>
    </FormScroll>
  );
}
