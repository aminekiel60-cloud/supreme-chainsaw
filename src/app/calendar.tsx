/** CALENDAR — month view of your daily progress, workouts and streaks (from Home or Profile). */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HabitList } from '@/components/HabitList';
import { Card, ProgressBar, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { prettyDate, toKey, todayKey } from '@/store/dates';
import { currentStreak, dayProgress, dayTotals, isLockedIn, workoutsOn } from '@/store/logic';
import { useStore } from '@/store/store';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function CalendarScreen() {
  const { state } = useStore();
  const today = todayKey();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  // Build the grid: blank cells until the 1st falls on the right weekday.
  const leading = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toKey(new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const progress = dayProgress(state, selected);
  const totals = dayTotals(state, selected);
  const workouts = workoutsOn(state, selected);

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <View style={s.rowBetween}>
        <Text style={[Type.title, { color: Colors.text }]}>Your month</Text>
        <View style={s.streak}>
          <Ionicons name="flame" size={16} color={Colors.lime} />
          <Text style={{ color: Colors.lime, fontWeight: '800' }}>{currentStreak(state)} day streak</Text>
        </View>
      </View>

      <Card style={{ gap: Spacing.md }}>
        <View style={s.rowBetween}>
          <Pressable hitSlop={10} onPress={() => shift(-1)}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={[Type.heading, { color: Colors.text }]}>
            {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable hitSlop={10} onPress={() => shift(1)}>
            <Ionicons name="chevron-forward" size={22} color={Colors.text} />
          </Pressable>
        </View>

        <View style={s.grid}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={[s.cell, s.weekday]}>
              {d}
            </Text>
          ))}
          {cells.map((key, i) => {
            if (!key) return <View key={i} style={s.cell} />;
            const p = dayProgress(state, key);
            const locked = isLockedIn(state, key);
            const trained = workoutsOn(state, key).length > 0;
            return (
              <Pressable key={i} style={s.cell} onPress={() => setSelected(key)}>
                <View
                  style={[
                    s.day,
                    p > 0 && { backgroundColor: `rgba(163,255,63,${0.1 + p * 0.35})` },
                    locked && { borderColor: Colors.lime },
                    key === selected && s.selected,
                  ]}>
                  <Text style={[s.dayText, key === today && { color: Colors.lime }]}>
                    {Number(key.slice(8))}
                  </Text>
                  {trained && <View style={s.dot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={ui.muted}>Brighter = more habits done · outlined = locked-in day · dot = workout</Text>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle action={<Text style={[Type.heading, { color: Colors.lime }]}>{Math.round(progress * 100)}%</Text>}>
          {prettyDate(selected)}
        </SectionTitle>
        <ProgressBar progress={progress} />
        <Text style={ui.muted}>
          {Math.round(totals.kcal)} kcal · {Math.round(totals.protein)} g protein · {workouts.length} workout
          {workouts.length === 1 ? '' : 's'}
        </Text>
        <HabitList date={selected} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.limeSoft,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  weekday: { color: Colors.textMuted, textAlign: 'center', fontWeight: '700', fontSize: 12, aspectRatio: 2 },
  day: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: Colors.cardRaised,
  },
  selected: { borderColor: Colors.text },
  dayText: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  dot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.lime },
});
