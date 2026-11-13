/** COACH VIEW — a friend's day (food, macros, habits, training), shared with you by them. */
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ProgressRing } from '@/components/ProgressRing';
import { Card, ProgressBar, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { getClientData } from '@/lib/social';
import { addDays, prettyDate, todayKey } from '@/store/dates';
import { DEFAULT_HABIT_GOALS, HABITS, dayProgress, dayTotals, formatDistance, habitDone, habitTitle, sport, workoutsOn } from '@/store/logic';
import type { AppState } from '@/store/types';

export default function CoachClientScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [data, setData] = useState<Partial<AppState> | null | undefined>(undefined);
  const [day, setDay] = useState(todayKey());

  useEffect(() => {
    getClientData(id).then(setData).catch(() => setData(null));
  }, [id]);

  if (data === undefined) return <ActivityIndicator color={Colors.lime} style={{ flex: 1, backgroundColor: Colors.background }} />;
  if (!data || !data.goals) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: 'center' }}>
        <Text style={[ui.text, { textAlign: 'center' }]}>No shared data yet, or {name ?? 'your friend'} turned Coach off.</Text>
      </View>
    );
  }

  // Older saved data may miss newer fields.
  const state = {
    food: [],
    workouts: [],
    water: {},
    myFoods: [],
    challengeWins: [],
    health: {},
    checks: {},
    likes: [],
    ...data,
    goals: { ...DEFAULT_HABIT_GOALS, ...data.goals },
  } as AppState;
  const totals = dayTotals(state, day);
  const meals = state.food.filter((f) => f.date === day);

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: name ?? 'Coach' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable hitSlop={12} onPress={() => setDay(addDays(day, -1))}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={[Type.heading, { color: Colors.text }]}>{day === todayKey() ? 'Today' : prettyDate(day)}</Text>
        <Pressable hitSlop={12} disabled={day >= todayKey()} onPress={() => setDay(addDays(day, 1))}>
          <Ionicons name="chevron-forward" size={24} color={day >= todayKey() ? Colors.textFaint : Colors.text} />
        </Pressable>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <ProgressRing size={120} stroke={10} progress={totals.kcal / state.goals.kcal}>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '900' }}>{Math.round(totals.kcal)}</Text>
          <Text style={ui.muted}>/ {state.goals.kcal}</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: Spacing.sm }}>
          <Macro label="Protein" value={totals.protein} goal={state.goals.protein} color={Colors.protein} />
          <Macro label="Carbs" value={totals.carbs} goal={state.goals.carbs} color={Colors.carbs} />
          <Macro label="Fat" value={totals.fat} goal={state.goals.fat} color={Colors.fat} />
        </View>
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle action={<Text style={{ color: Colors.lime, fontWeight: '900' }}>{Math.round(dayProgress(state, day) * 100)}%</Text>}>
          Habits
        </SectionTitle>
        {HABITS.map((h) => (
          <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={habitDone(state, day, h.id) ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={habitDone(state, day, h.id) ? Colors.lime : Colors.textFaint}
            />
            <Text style={ui.text}>{habitTitle(state, h.id)}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>Meals</SectionTitle>
        {meals.length === 0 && <Text style={ui.muted}>Nothing logged.</Text>}
        {meals.map((f) => (
          <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[ui.text, { flex: 1 }]} numberOfLines={1}>
              <Text style={ui.muted}>{f.meal} · </Text>
              {f.name}
            </Text>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>{f.kcal}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>Training</SectionTitle>
        {workoutsOn(state, day).length === 0 && <Text style={ui.muted}>No workout.</Text>}
        {workoutsOn(state, day).map((w) => (
          <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={sport(w.type).icon} size={18} color={Colors.lime} />
            <Text style={[ui.text, { flex: 1 }]}>{w.title}</Text>
            <Text style={ui.muted}>
              {w.durationMin} min{w.distanceKm ? ` · ${formatDistance(w)}` : ''}
            </Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
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
