/** BODY WEIGHT — log your weight, see the trend, and keep your goals in step with it. */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { LineChart } from '@/components/LineChart';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { addDays, prettyDate, todayKey } from '@/store/dates';
import { useStore } from '@/store/store';

export default function BodyWeightScreen() {
  const { state, dispatch } = useStore();
  const entries = state.bodyWeight;
  const latest = entries[entries.length - 1];
  const [kg, setKg] = useState(latest ? String(latest.kg) : state.profile ? String(state.profile.weightKg) : '');
  const [date, setDate] = useState(todayKey());
  const value = Number(kg.replace(',', '.'));
  const valid = value >= 30 && value <= 300;

  const since = (days: number) => entries.filter((e) => e.date >= addDays(todayKey(), -days));
  const month = since(30);
  const change = month.length >= 2 ? Math.round((month[month.length - 1].kg - month[0].kg) * 10) / 10 : null;
  const points = entries.slice(-30).map((e) => ({ label: e.date.slice(5).split('-').reverse().join('/'), value: e.kg }));

  const save = () => {
    haptics.add();
    dispatch({ type: 'logBodyWeight', entry: { date, kg: Math.round(value * 10) / 10 } });
    Alert.alert('Logged', `${value} kg on ${prettyDate(date)}${date === todayKey() ? ' — your goals are updated too.' : ''}`);
  };

  return (
    <FormScroll>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Card style={{ flex: 1, padding: 12, gap: 2 }}>
          <Text style={ui.statLabel}>Current</Text>
          <Text style={ui.statValue}>{latest ? `${latest.kg} kg` : state.profile ? `${state.profile.weightKg} kg` : '—'}</Text>
          <Text style={ui.muted}>{latest ? prettyDate(latest.date) : 'from your profile'}</Text>
        </Card>
        <Card style={{ flex: 1, padding: 12, gap: 2 }}>
          <Text style={ui.statLabel}>30 days</Text>
          <Text style={[ui.statValue, change !== null && change > 0 && { color: Colors.fat }]}>
            {change === null ? '—' : `${change > 0 ? '+' : ''}${change} kg`}
          </Text>
          <Text style={ui.muted}>{state.profile?.goal === 'cut' ? 'goal: lose fat' : state.profile?.goal === 'bulk' ? 'goal: build muscle' : 'goal: maintain'}</Text>
        </Card>
      </View>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Trend</SectionTitle>
        <LineChart points={points} unit=" kg" color={Colors.carbs} />
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Log weight</SectionTitle>
        <Field label="Weight (kg)" keyboardType="decimal-pad" placeholder="e.g. 74.5" value={kg} onChangeText={setKg} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="Today" active={date === todayKey()} onPress={() => setDate(todayKey())} />
          <Chip label="Yesterday" active={date === addDays(todayKey(), -1)} onPress={() => setDate(addDays(todayKey(), -1))} />
        </View>
        <Text style={ui.muted}>Tip: weigh yourself in the morning, after the bathroom, before breakfast — same conditions every time.</Text>
        <Button title="Save" icon="checkmark" disabled={!valid} onPress={save} />
      </Card>

      {entries.length > 0 && (
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle>History</SectionTitle>
          {[...entries].reverse().slice(0, 30).map((e) => (
            <View key={e.date} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Text style={[ui.text, { flex: 1 }]}>{prettyDate(e.date)}</Text>
              <Text style={{ color: Colors.text, fontWeight: '800' }}>{e.kg} kg</Text>
              <Pressable hitSlop={8} onPress={() => dispatch({ type: 'removeBodyWeight', date: e.date })}>
                <Ionicons name="close" size={18} color={Colors.textFaint} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </FormScroll>
  );
}
