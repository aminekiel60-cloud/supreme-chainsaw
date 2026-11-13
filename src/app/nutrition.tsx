/** FOOD DIARY: calories, macros and meals per day. Tap an entry to change it. */
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CountUp, FadeInCard } from '@/components/motion';
import { ProgressRing } from '@/components/ProgressRing';
import { StackPage } from '@/components/layout';
import { Card, ProgressBar, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { addDays, prettyDate, todayKey } from '@/store/dates';
import { amountLabel, dayTotals, goalsFor } from '@/store/logic';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

const MEALS: { meal: Meal; icon: 'sunny' | 'restaurant' | 'moon' | 'cafe'; share: number }[] = [
  { meal: 'Breakfast', icon: 'sunny', share: 0.25 },
  { meal: 'Lunch', icon: 'restaurant', share: 0.35 },
  { meal: 'Dinner', icon: 'moon', share: 0.3 },
  { meal: 'Snacks', icon: 'cafe', share: 0.1 },
];

export default function FoodScreen() {
  const { state, dispatch } = useStore();
  const today = todayKey();
  const params = useLocalSearchParams<{ date?: string }>();
  const [day, setDay] = useState(params.date && params.date <= today ? params.date : today);
  const totals = dayTotals(state, day);
  const goals = goalsFor(state, day);
  const remaining = goals.kcal - totals.kcal;
  const items = state.food.filter((f) => f.date === day);
  const yesterday = addDays(day, -1);

  const copyFromYesterday = (meal: Meal) => {
    haptics.add();
    for (const f of state.food.filter((x) => x.date === yesterday && x.meal === meal)) {
      dispatch({ type: 'addFood', entry: { name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, base: f.base, meal, date: day } });
    }
  };

  return (
    <StackPage>
      <View style={s.dayRow}>
        <Pressable hitSlop={12} onPress={() => setDay(addDays(day, -1))}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={[Type.title, { color: Colors.text }]}>{day === today ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : prettyDate(day)}</Text>
          {day !== today && (
            <Pressable onPress={() => setDay(today)}>
              <Text style={{ color: Colors.lime, fontWeight: '700' }}>Back to today</Text>
            </Pressable>
          )}
        </View>
        <Pressable hitSlop={12} disabled={day >= today} onPress={() => setDay(addDays(day, 1))}>
          <Ionicons name="chevron-forward" size={26} color={day >= today ? Colors.textFaint : Colors.text} />
        </Pressable>
      </View>

      <FadeInCard index={0}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
          <ProgressRing size={130} stroke={11} progress={totals.kcal / goals.kcal}>
            <CountUp value={Math.round(totals.kcal)} style={{ color: Colors.text, fontSize: 28, fontWeight: '800' }} />
            <Text style={ui.muted}>kcal eaten</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: Spacing.md }}>
            <View>
              <Text style={ui.statLabel}>{remaining >= 0 ? 'Remaining' : 'Over goal'}</Text>
              <Text style={[ui.statValue, remaining < 0 && { color: Colors.fat }]}>{Math.abs(Math.round(remaining))} kcal</Text>
            </View>
            <MacroLine label="Protein" value={totals.protein} goal={goals.protein} color={Colors.protein} />
            <MacroLine label="Carbs" value={totals.carbs} goal={goals.carbs} color={Colors.carbs} />
            <MacroLine label="Fat" value={totals.fat} goal={goals.fat} color={Colors.fat} />
          </View>
        </Card>
      </FadeInCard>

      {MEALS.map(({ meal, icon, share }, i) => {
        const mealItems = items.filter((f) => f.meal === meal);
        const kcal = mealItems.reduce((t, f) => t + f.kcal, 0);
        const budget = Math.round((goals.kcal * share) / 10) * 10;
        const canCopy = mealItems.length === 0 && state.food.some((f) => f.date === yesterday && f.meal === meal);
        return (
          <FadeInCard key={meal} index={i + 1}>
            <Card style={{ gap: Spacing.md }}>
              <View style={s.mealHead}>
                <View style={s.mealIcon}>
                  <Ionicons name={icon} size={18} color={Colors.lime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Type.heading, { color: Colors.text }]}>{meal}</Text>
                  <Text style={ui.muted}>
                    {Math.round(kcal)} / {budget} kcal
                  </Text>
                </View>
                <Pressable
                  hitSlop={8}
                  style={s.add}
                  onPress={() => router.push({ pathname: '/add-food', params: { meal, date: day } })}
                  accessibilityLabel={`Add food to ${meal}`}>
                  <Ionicons name="add" size={22} color={Colors.background} />
                </Pressable>
              </View>
              {mealItems.map((f) => (
                <Pressable key={f.id} onPress={() => router.push({ pathname: '/food/[id]', params: { id: f.id } })} style={s.entry}>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.text} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={ui.muted}>
                      {amountLabel(f) ? `${amountLabel(f)} · ` : ''}P {Math.round(f.protein)}g · C {Math.round(f.carbs)}g · F {Math.round(f.fat)}g
                    </Text>
                  </View>
                  <Text style={{ color: Colors.text, fontWeight: '800' }}>{Math.round(f.kcal)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textFaint} />
                </Pressable>
              ))}
              {canCopy && (
                <Pressable onPress={() => copyFromYesterday(meal)} style={s.copy}>
                  <Ionicons name="copy-outline" size={16} color={Colors.lime} />
                  <Text style={{ color: Colors.lime, fontWeight: '700' }}>Copy yesterday&apos;s {meal.toLowerCase()}</Text>
                </Pressable>
              )}
            </Card>
          </FadeInCard>
        );
      })}
    </StackPage>
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

const s = StyleSheet.create({
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  mealIcon: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.limeSoft, alignItems: 'center', justifyContent: 'center' },
  add: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
});
