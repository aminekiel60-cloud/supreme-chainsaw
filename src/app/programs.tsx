/** PROGRAMS: pick a training plan. The app keeps track of the next day and suggests the weights. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill, StackPage } from '@/components/layout';
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { PROGRAMS, type Program } from '@/data/programs';
import { haptics } from '@/lib/haptics';
import { nextProgramDay, startProgramDay } from '@/lib/workouts';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';

export default function ProgramsScreen() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState<string | null>(state.program?.id ?? null);
  const next = nextProgramDay(state);

  const follow = (p: Program) => {
    const run = () => {
      haptics.success();
      dispatch({ type: 'apply', change: () => ({ program: { id: p.id, startedAt: todayKey(), nextDay: 0 } }) });
    };
    if (state.program && state.program.id !== p.id) {
      Alert.alert('Switch program?', `You stop following your current program and start ${p.name} from day 1.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: run },
      ]);
    } else run();
  };

  const stop = () =>
    Alert.alert('Stop this program?', 'Your workouts stay saved. You can pick a program again any time.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => dispatch({ type: 'apply', change: () => ({ program: null }) }) },
    ]);

  return (
    <StackPage>
      {next && (
        <Card highlight style={{ gap: Spacing.md }}>
          <Text style={ui.statLabel}>UP NEXT IN {next.program.name.toUpperCase()}</Text>
          <Text style={[Type.title, { color: Colors.text }]}>{next.day.name}</Text>
          <Text style={ui.muted}>{next.day.exercises.map((e) => e.name).join(', ')}</Text>
          <Button
            title={state.activeWorkout ? 'Back to your workout' : `Start ${next.day.name}`}
            icon="play"
            onPress={() => {
              if (!state.activeWorkout) startProgramDay(state, dispatch, next.program, next.day);
              router.push('/active-workout');
            }}
          />
        </Card>
      )}

      {PROGRAMS.map((p) => {
        const following = state.program?.id === p.id;
        const expanded = open === p.id;
        return (
          <Card key={p.id} highlight={following} style={{ gap: Spacing.md }}>
            <Pressable onPress={() => setOpen(expanded ? null : p.id)} style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={s.icon}>
                  <Ionicons name={p.id === 'home' ? 'home' : 'barbell'} size={20} color={Colors.lime} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Type.heading, { color: Colors.text }]}>{p.name}</Text>
                  <Text style={ui.muted}>{p.goal}</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Pill icon="person" text={p.level} />
                <Pill icon="calendar" text={`${p.daysPerWeek} days a week`} />
                {following && <Pill icon="checkmark" text="Following" active />}
              </View>
            </Pressable>
            {expanded && (
              <View style={{ gap: Spacing.md }}>
                <Text style={ui.text}>{p.description}</Text>
                <View style={s.note}>
                  <Ionicons name="trending-up" size={16} color={Colors.lime} />
                  <Text style={[ui.muted, { flex: 1 }]}>{p.progression}</Text>
                </View>
                {p.days.map((d, i) => (
                  <View key={d.id} style={{ gap: 4 }}>
                    <Text style={{ color: following && state.program!.nextDay % p.days.length === i ? Colors.lime : Colors.text, fontWeight: '800' }}>
                      Day {i + 1}: {d.name}
                    </Text>
                    {d.exercises.map((e) => (
                      <View key={e.name} style={s.exRow}>
                        <Text style={[ui.muted, { flex: 1 }]}>{e.name}</Text>
                        <Text style={ui.muted}>
                          {e.sets} × {e.reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
                {following ? (
                  <Button title="Stop this program" icon="stop-circle-outline" variant="ghost" onPress={stop} />
                ) : (
                  <Button title="Follow this program" icon="checkmark-circle" onPress={() => follow(p)} />
                )}
              </View>
            )}
          </Card>
        );
      })}
    </StackPage>
  );
}

const s = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.limeSoft, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.cardRaised, padding: 10, borderRadius: Radius.sm },
  exRow: { flexDirection: 'row', paddingLeft: 8 },
});
