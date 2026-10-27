/** NUTRITION — calories and macros for today, grouped per meal. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ProgressRing } from '@/components/ProgressRing';
import { Button, Card, ProgressBar, Screen, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { prettyDate, todayKey } from '@/store/dates';
import { dayTotals } from '@/store/logic';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function NutritionScreen() {
  const { state, dispatch } = useStore();
  const today = todayKey();
  const totals = dayTotals(state, today);
  const remaining = state.goals.kcal - totals.kcal;
  const items = state.food.filter((f) => f.date === today);

  return (
    <Screen right={<Text style={ui.muted}>{prettyDate(today)}</Text>}>
      <Text style={[Type.title, { color: Colors.text }]}>Nutrition</Text>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <ProgressRing size={130} stroke={11} progress={totals.kcal / state.goals.kcal}>
          <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '800' }}>{Math.round(totals.kcal)}</Text>
          <Text style={ui.muted}>kcal eaten</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: Spacing.md }}>
          <View>
            <Text style={ui.statLabel}>{remaining >= 0 ? 'Remaining' : 'Over goal'}</Text>
            <Text style={ui.statValue}>{Math.abs(Math.round(remaining))} kcal</Text>
          </View>
          <MacroLine label="Protein" value={totals.protein} goal={state.goals.protein} color={Colors.protein} />
          <MacroLine label="Carbs" value={totals.carbs} goal={state.goals.carbs} color={Colors.carbs} />
          <MacroLine label="Fat" value={totals.fat} goal={state.goals.fat} color={Colors.fat} />
        </View>
      </Card>

      <Button title="Add food" icon="add" onPress={() => router.push('/add-food')} />

      {MEALS.map((meal) => {
        const mealItems = items.filter((f) => f.meal === meal);
        const kcal = mealItems.reduce((t, f) => t + f.kcal, 0);
        return (
          <Card key={meal} style={{ gap: Spacing.md }}>
            <SectionTitle action={<Text style={ui.muted}>{Math.round(kcal)} kcal</Text>}>{meal}</SectionTitle>
            {mealItems.length === 0 ? (
              <Text style={ui.muted}>Nothing logged yet</Text>
            ) : (
              mealItems.map((f) => (
                <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.text}>{f.name}</Text>
                    <Text style={ui.muted}>
                      P {f.protein}g · C {f.carbs}g · F {f.fat}g
                    </Text>
                  </View>
                  <Text style={{ color: Colors.text, fontWeight: '700' }}>{f.kcal}</Text>
                  <Pressable hitSlop={10} onPress={() => dispatch({ type: 'removeFood', id: f.id })}>
                    <Ionicons name="close-circle" size={20} color={Colors.textFaint} />
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

function MacroLine({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={ui.statLabel}>{label}</Text>
        <Text style={ui.muted}>
          {Math.round(value)} / {goal} g
        </Text>
      </View>
      <ProgressBar progress={value / goal} color={color} />
    </View>
  );
}
