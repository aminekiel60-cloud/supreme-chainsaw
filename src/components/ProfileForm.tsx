/**
 * Form for your personal details. Shows a live preview of the daily goals
 * they produce. Used by onboarding and by the Profile screen.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { ACTIVITY_LEVELS, GOAL_TYPES, calculateGoals } from '@/store/logic';
import type { Activity, GoalType, Profile, Sex } from '@/store/types';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from './ui';

const num = (v: string) => Number(v.replace(',', '.')) || 0;

export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Profile | null;
  submitLabel: string;
  onSubmit: (p: Profile) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male');
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : '');
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : '');
  const [activity, setActivity] = useState<Activity>(initial?.activity ?? 'moderate');
  const [goal, setGoal] = useState<GoalType>(initial?.goal ?? 'maintain');

  const profile: Profile = {
    name: name.trim(),
    sex,
    age: num(age),
    heightCm: num(height),
    weightKg: num(weight),
    activity,
    goal,
  };
  const valid =
    profile.name.length > 0 &&
    profile.age >= 13 &&
    profile.age <= 100 &&
    profile.heightCm >= 120 &&
    profile.heightCm <= 230 &&
    profile.weightKg >= 35 &&
    profile.weightKg <= 250;
  const goals = valid ? calculateGoals(profile) : null;

  return (
    <View style={{ gap: Spacing.lg }}>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>About you</SectionTitle>
        <Field label="Name" placeholder="Your first name" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="Male" active={sex === 'male'} onPress={() => setSex('male')} />
          <Chip label="Female" active={sex === 'female'} onPress={() => setSex('female')} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="Age" keyboardType="numeric" placeholder="25" value={age} onChangeText={setAge} />
          <Field label="Height (cm)" keyboardType="numeric" placeholder="180" value={height} onChangeText={setHeight} />
          <Field label="Weight (kg)" keyboardType="decimal-pad" placeholder="75" value={weight} onChangeText={setWeight} />
        </View>
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>How active are you?</SectionTitle>
        {ACTIVITY_LEVELS.map((a) => (
          <Option key={a.id} label={a.label} detail={a.detail} active={activity === a.id} onPress={() => setActivity(a.id)} />
        ))}
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>Your goal</SectionTitle>
        {GOAL_TYPES.map((g) => (
          <Option key={g.id} label={g.label} detail={g.detail} active={goal === g.id} onPress={() => setGoal(g.id)} />
        ))}
      </Card>

      <Card highlight style={{ gap: Spacing.sm }}>
        <SectionTitle>Your daily goals</SectionTitle>
        {goals ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Goal label="kcal" value={goals.kcal} />
            <Goal label="protein" value={`${goals.protein} g`} />
            <Goal label="carbs" value={`${goals.carbs} g`} />
            <Goal label="fat" value={`${goals.fat} g`} />
          </View>
        ) : (
          <Text style={ui.muted}>Fill in your details to see your goals.</Text>
        )}
      </Card>

      <Button title={submitLabel} icon="lock-closed" disabled={!valid} onPress={() => onSubmit(profile)} />
    </View>
  );
}

function Option({ label, detail, active, onPress }: { label: string; detail: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.option, active && s.optionActive]}>
      <View style={[s.radio, active && s.radioActive]} />
      <View style={{ flex: 1 }}>
        <Text style={[ui.text, { fontWeight: '700' }]}>{label}</Text>
        <Text style={ui.muted}>{detail}</Text>
      </View>
    </Pressable>
  );
}

function Goal({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: Colors.lime, fontSize: 20, fontWeight: '800' }}>{value}</Text>
      <Text style={ui.muted}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardRaised,
  },
  optionActive: { borderColor: Colors.limeBorder, backgroundColor: '#1C2612' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.textFaint },
  radioActive: { borderColor: Colors.lime, backgroundColor: Colors.lime },
});
