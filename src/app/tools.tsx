/** CALCULATORS: one-rep max with a percentage table, and the plate calculator. */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StackPage } from '@/components/layout';
import { PlateCalc } from '@/components/PlateCalc';
import { Button, Card, Field, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { oneRepMax } from '@/store/exercises';

const num = (v: string) => Number(v.replace(',', '.')) || 0;

/** Rough reps you can do at a % of your max (Epley, rounded). */
const TABLE = [
  { pct: 100, reps: 1 },
  { pct: 95, reps: 2 },
  { pct: 90, reps: 4 },
  { pct: 85, reps: 6 },
  { pct: 80, reps: 8 },
  { pct: 75, reps: 10 },
  { pct: 70, reps: 12 },
  { pct: 65, reps: 15 },
  { pct: 60, reps: 20 },
];

export default function ToolsScreen() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [plates, setPlates] = useState<number | null>(null);
  const max = num(weight) > 0 && num(reps) > 0 ? oneRepMax({ weight: num(weight), reps: Math.round(num(reps)) }) : 0;
  const round = (kg: number) => Math.round(kg / 2.5) * 2.5;

  return (
    <StackPage>
      <Card style={{ gap: Spacing.md }}>
        <Text style={[Type.heading, { color: Colors.text }]}>One-rep max</Text>
        <Text style={ui.muted}>Enter a set you did. The app estimates the most you could lift once.</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <Field label="Weight (kg)" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="100" />
          <Field label="Reps" keyboardType="number-pad" value={reps} onChangeText={setReps} placeholder="5" />
        </View>
        {max > 0 && (
          <>
            <View style={s.result}>
              <Text style={ui.statLabel}>ESTIMATED 1RM</Text>
              <Text style={{ color: Colors.lime, fontSize: 44, fontWeight: '900' }}>{max} kg</Text>
            </View>
            <View style={s.table}>
              <View style={[s.row, s.head]}>
                <Text style={[s.cell, ui.statLabel]}>% OF MAX</Text>
                <Text style={[s.cell, ui.statLabel]}>WEIGHT</Text>
                <Text style={[s.cell, ui.statLabel]}>ABOUT</Text>
              </View>
              {TABLE.map((r) => (
                <View key={r.pct} style={s.row}>
                  <Text style={[s.cell, ui.text]}>{r.pct}%</Text>
                  <Text style={[s.cell, ui.text, { fontWeight: '800' }]}>{round((max * r.pct) / 100)} kg</Text>
                  <Text style={[s.cell, ui.muted]}>{r.reps} {r.reps === 1 ? 'rep' : 'reps'}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <Text style={[Type.heading, { color: Colors.text }]}>Plate calculator</Text>
        <Text style={ui.muted}>Which plates go on each side of the bar.</Text>
        <Button title="Open plate calculator" icon="disc-outline" variant="ghost" onPress={() => setPlates(max ? round(max * 0.8) : 60)} />
      </Card>

      {plates !== null && <PlateCalc weight={plates} onClose={() => setPlates(null)} />}
    </StackPage>
  );
}

const s = StyleSheet.create({
  result: { alignItems: 'center', paddingVertical: Spacing.sm },
  table: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  head: { backgroundColor: Colors.cardRaised },
  cell: { flex: 1 },
});
