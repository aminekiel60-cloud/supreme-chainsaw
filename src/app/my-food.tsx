/** CREATE FOOD — save your own food or recipe once, add it in one tap afterwards. */
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Button, Card, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useStore } from '@/store/store';

const num = (v: string) => Number(v.replace(',', '.'));

export default function MyFoodScreen() {
  const { state, dispatch } = useStore();
  // With ?id=… this screen edits one of your foods.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = state.myFoods.find((f) => f.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [portion, setPortion] = useState(existing?.portion ?? '');
  const [kcal, setKcal] = useState(existing ? String(existing.kcal) : '');
  const [protein, setProtein] = useState(existing ? String(existing.protein) : '');
  const [carbs, setCarbs] = useState(existing ? String(existing.carbs) : '');
  const [fat, setFat] = useState(existing ? String(existing.fat) : '');

  const values = [kcal, protein, carbs, fat].map(num);
  const valid = name.trim().length > 0 && kcal.trim() !== '' && values.every((v) => Number.isFinite(v) && v >= 0);

  const save = () => {
    const food = {
      name: name.trim(),
      portion: portion.trim() || '1 portion',
      kcal: Math.round(values[0]),
      protein: values[1] || 0,
      carbs: values[2] || 0,
      fat: values[3] || 0,
    };
    dispatch(existing ? { type: 'updateMyFood', id: existing.id, changes: food } : { type: 'addMyFood', food });
    router.back();
  };

  return (
    <FormScroll>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Your food</SectionTitle>
        <Text style={ui.muted}>Great for home recipes and things you eat often, like your usual breakfast or protein shake.</Text>
        <Field label="Name" placeholder="e.g. Mom's lasagne" value={name} onChangeText={setName} />
        <Field label="Portion" placeholder="e.g. 1 plate (400 g)" value={portion} onChangeText={setPortion} />
      </Card>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Per portion</SectionTitle>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="kcal" keyboardType="decimal-pad" placeholder="0" value={kcal} onChangeText={setKcal} />
          <Field label="Protein g" keyboardType="decimal-pad" placeholder="0" value={protein} onChangeText={setProtein} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="Carbs g" keyboardType="decimal-pad" placeholder="0" value={carbs} onChangeText={setCarbs} />
          <Field label="Fat g" keyboardType="decimal-pad" placeholder="0" value={fat} onChangeText={setFat} />
        </View>
      </Card>
      <Stack.Screen options={{ title: existing ? 'Edit food' : 'Create food' }} />
      <Button title={existing ? 'Save changes' : 'Save to My foods'} icon="bookmark" disabled={!valid} onPress={save} />
    </FormScroll>
  );
}
