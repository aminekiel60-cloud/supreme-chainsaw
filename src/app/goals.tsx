/** GOALS: your calories, macros, training days and daily habit targets. */
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Pill } from '@/components/layout';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { calculateGoals } from '@/store/logic';
import { useStore } from '@/store/store';

const WATER_GOALS = [1500, 2000, 2500, 3000, 3500, 4000];
const BOTTLES = [250, 330, 500, 750, 1000];
const STEP_GOALS = [6000, 8000, 10000, 12000, 15000];
const SLEEP_HOURS = [22, 23, 24];
const TRAINING_DAYS = [2, 3, 4, 5, 6];
const TRAINING_KCAL = [0, 200, 300, 400, 500];

const num = (v: string) => Math.round(Number(v.replace(',', '.')) || 0);

export default function GoalsScreen() {
  const { state, dispatch } = useStore();
  const g = state.goals;
  const [custom, setCustom] = useState(Boolean(g.customMacros));
  const [kcal, setKcal] = useState(String(g.kcal));
  const [protein, setProtein] = useState(String(g.protein));
  const [carbs, setCarbs] = useState(String(g.carbs));
  const [fat, setFat] = useState(String(g.fat));
  const [steps, setSteps] = useState(g.steps);
  const [water, setWater] = useState(g.waterMl);
  const [bottle, setBottle] = useState(state.settings.bottleMl);
  const [sleepBy, setSleepBy] = useState(g.sleepByHour);
  const [perWeek, setPerWeek] = useState(g.workoutsPerWeek);
  const [trainingKcal, setTrainingKcal] = useState(g.trainingDayKcal);

  const calculated = state.profile ? calculateGoals(state.profile) : null;
  const macroKcal = num(protein) * 4 + num(carbs) * 4 + num(fat) * 9;

  const save = () => {
    const macros = custom
      ? { kcal: num(kcal), protein: num(protein), carbs: num(carbs), fat: num(fat) }
      : calculated ?? { kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat };
    dispatch({
      type: 'setGoals',
      goals: { ...g, ...macros, customMacros: custom, steps, waterMl: water, sleepByHour: sleepBy, workoutsPerWeek: perWeek, trainingDayKcal: trainingKcal },
    });
    dispatch({ type: 'setSettings', settings: { ...state.settings, bottleMl: bottle } });
    router.back();
  };

  return (
    <FormScroll>
      <Card style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <SectionTitle>Calories and macros</SectionTitle>
            <Text style={ui.muted}>{custom ? 'Your own numbers' : 'Calculated from your profile'}</Text>
          </View>
          <Switch
            value={custom}
            onValueChange={setCustom}
            trackColor={{ true: Colors.lime, false: Colors.border }}
            thumbColor={Colors.text}
          />
        </View>
        {custom ? (
          <>
            <Field label="Calories (kcal)" keyboardType="numeric" value={kcal} onChangeText={setKcal} />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Field label="Protein g" keyboardType="numeric" value={protein} onChangeText={setProtein} />
              <Field label="Carbs g" keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
              <Field label="Fat g" keyboardType="numeric" value={fat} onChangeText={setFat} />
            </View>
            <Text style={[ui.muted, Math.abs(macroKcal - num(kcal)) > 150 && { color: Colors.fat }]}>
              Your macros add up to {macroKcal} kcal.
              {Math.abs(macroKcal - num(kcal)) > 150 ? ` That is ${macroKcal > num(kcal) ? 'more' : 'less'} than your calorie goal.` : ' That matches your calorie goal.'}
            </Text>
          </>
        ) : (
          calculated && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Pill text={`${calculated.kcal} kcal`} />
              <Pill text={`Protein ${calculated.protein} g`} />
              <Pill text={`Carbs ${calculated.carbs} g`} />
              <Pill text={`Fat ${calculated.fat} g`} />
            </View>
          )
        )}
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Training</SectionTitle>
        <Text style={ui.muted}>Days a week you want to train</Text>
        <Chips values={TRAINING_DAYS} selected={perWeek} onSelect={setPerWeek} format={(v) => `${v} days`} />
        <Text style={ui.muted}>Extra calories on days you train (added as carbs)</Text>
        <Chips values={TRAINING_KCAL} selected={trainingKcal} onSelect={setTrainingKcal} format={(v) => (v ? `+${v} kcal` : 'None')} />
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Water</SectionTitle>
        <Text style={ui.muted}>Daily goal</Text>
        <Chips values={WATER_GOALS} selected={water} onSelect={setWater} format={(v) => `${v / 1000} L`} />
        <Text style={ui.muted}>One bottle in the water tracker</Text>
        <Chips values={BOTTLES} selected={bottle} onSelect={setBottle} format={(v) => `${v} ml`} />
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Steps</SectionTitle>
        <Chips values={STEP_GOALS} selected={steps} onSelect={setSteps} format={(v) => v.toLocaleString('en-US')} />
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Sleep</SectionTitle>
        <Text style={ui.muted}>Asleep by</Text>
        <Chips values={SLEEP_HOURS} selected={sleepBy} onSelect={setSleepBy} format={(v) => `${String(v % 24).padStart(2, '0')}:00`} />
      </Card>

      <Button title="Save goals" icon="checkmark" onPress={save} disabled={custom && num(kcal) < 1000} />
    </FormScroll>
  );
}

function Chips({
  values,
  selected,
  onSelect,
  format,
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
      {values.map((v) => (
        <Chip key={v} label={format(v)} active={selected === v} onPress={() => onSelect(v)} />
      ))}
    </View>
  );
}
