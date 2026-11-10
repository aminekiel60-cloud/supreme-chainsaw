/** TRAINING — weekly summary plus your workout history. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Screen, SectionTitle, Stat, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { prettyDate, startOfWeek, todayKey } from '@/store/dates';
import { pace } from '@/store/logic';
import { useStore } from '@/store/store';

const ICONS = { gym: 'barbell', run: 'walk', other: 'bicycle' } as const;

export default function TrainingScreen() {
  const { state, dispatch } = useStore();
  const weekStart = startOfWeek(todayKey());
  const thisWeek = state.workouts.filter((w) => w.date >= weekStart);
  const km = thisWeek.reduce((t, w) => t + (w.distanceKm ?? 0), 0);
  const minutes = thisWeek.reduce((t, w) => t + w.durationMin, 0);
  const history = [...state.workouts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <Screen>
      <Text style={[Type.title, { color: Colors.text }]}>Training</Text>

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Stat label="Workouts" value={String(thisWeek.length)} unit="this week" />
        <Stat label="Distance" value={km.toFixed(1)} unit="km" />
        <Stat label="Time" value={String(minutes)} unit="min" />
      </View>

      <Button title="Log workout" icon="add" onPress={() => router.push('/log-workout')} />

      <SectionTitle>History</SectionTitle>
      {history.length === 0 && (
        <Card>
          <Text style={ui.muted}>No workouts yet. Your first one earns the “First workout” achievement.</Text>
        </Card>
      )}
      {history.map((w) => {
        const sets = w.exercises?.reduce((t, e) => t + e.sets.length, 0) ?? 0;
        const volume =
          w.exercises?.reduce((t, e) => t + e.sets.reduce((s, x) => s + x.reps * x.weight, 0), 0) ?? 0;
        return (
          <Card key={w.id} style={{ gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: Colors.limeSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name={ICONS[w.type]} size={20} color={Colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontWeight: '700' }]}>{w.title}</Text>
                <Text style={ui.muted}>{prettyDate(w.date)}</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => dispatch({ type: 'removeWorkout', id: w.id })}>
                <Ionicons name="trash-outline" size={18} color={Colors.textFaint} />
              </Pressable>
            </View>
            <Text style={ui.muted}>
              {w.durationMin} min
              {w.distanceKm ? ` · ${w.distanceKm} km · ${pace(w)}` : ''}
              {sets
                ? ` · ${w.exercises!.length} exercise${w.exercises!.length === 1 ? '' : 's'} · ${sets} set${sets === 1 ? '' : 's'} · ${volume.toLocaleString('en-US')} kg volume`
                : ''}
            </Text>
            {w.exercises?.map((e, i) => (
              <Text key={i} style={{ color: Colors.text, fontSize: 13 }}>
                {e.name}: {e.sets.map((x) => `${x.reps}×${x.weight}kg`).join(', ')}
              </Text>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
