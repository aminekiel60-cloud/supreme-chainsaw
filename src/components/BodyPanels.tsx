/** The three parts of Body: weight with a trend line, measurements, and progress photos with a before/after slider. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useUnits } from '@/lib/units';
import { keepPhoto, pickPhoto } from '@/lib/photos';
import { addDays, prettyDate, todayKey } from '@/store/dates';
import { newId } from '@/store/logic';
import { useStore } from '@/store/store';
import type { Measurement, ProgressPhoto } from '@/store/types';
import { LineChart } from './LineChart';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from './ui';

const num = (v: string) => Number(v.replace(',', '.'));
const short = (d: string) => d.slice(5).split('-').reverse().join('/');

/** Average of the last up to 7 entries at each point: hides day-to-day water swings. */
function movingAverage(values: number[], size = 7) {
  return values.map((_, i) => {
    const part = values.slice(Math.max(0, i - size + 1), i + 1);
    return Math.round((part.reduce((t, v) => t + v, 0) / part.length) * 10) / 10;
  });
}

export function WeightPanel() {
  const { state, dispatch } = useStore();
  const units = useUnits();
  const entries = state.bodyWeight;
  const latest = entries[entries.length - 1];
  const [kg, setKg] = useState(latest ? String(units.show(latest.kg)) : state.profile ? String(units.show(state.profile.weightKg)) : '');
  const [date, setDate] = useState(todayKey());
  const value = units.toKg(num(kg));
  const valid = value >= 30 && value <= 300;

  const recent = entries.slice(-60);
  const trend = movingAverage(recent.map((e) => e.kg));
  const month = entries.filter((e) => e.date >= addDays(todayKey(), -30));
  const monthTrend = movingAverage(month.map((e) => e.kg));
  const change = monthTrend.length >= 2 ? Math.round((monthTrend[monthTrend.length - 1] - monthTrend[0]) * 10) / 10 : null;
  const goal = state.profile?.goal === 'cut' ? 'Goal: lose fat' : state.profile?.goal === 'bulk' ? 'Goal: build muscle' : 'Goal: stay the same';

  const save = () => {
    haptics.add();
    dispatch({ type: 'logBodyWeight', entry: { date, kg: Math.round(value * 10) / 10 } });
    Alert.alert('Saved', date === todayKey() ? `${num(kg)} ${units.unit} today. Your calorie goals are updated too.` : `${num(kg)} ${units.unit} on ${prettyDate(date)}.`);
  };

  return (
    <>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Card style={s.stat}>
          <Text style={ui.statLabel}>NOW</Text>
          <Text style={ui.statValue}>{latest ? units.text(latest.kg) : state.profile ? units.text(state.profile.weightKg) : 'None'}</Text>
          <Text style={ui.muted}>{latest ? prettyDate(latest.date) : 'From your profile'}</Text>
        </Card>
        <Card style={s.stat}>
          <Text style={ui.statLabel}>LAST 30 DAYS</Text>
          <Text style={[ui.statValue, change !== null && change > 0 && state.profile?.goal === 'cut' && { color: Colors.fat }]}>
            {change === null ? 'None' : `${change > 0 ? '+' : ''}${units.show(change)} ${units.unit}`}
          </Text>
          <Text style={ui.muted}>{goal}</Text>
        </Card>
      </View>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Trend</SectionTitle>
        <LineChart
          points={recent.map((e) => ({ label: short(e.date), value: units.show(e.kg) }))}
          trend={recent.length > 2 ? trend.map(units.show) : undefined}
          unit={` ${units.unit}`}
          color={Colors.carbs}
        />
        {recent.length > 2 && <Text style={ui.muted}>The lime line is your 7-day average. It ignores the normal ups and downs from water and food.</Text>}
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Log weight</SectionTitle>
        <Field label={`Weight (${units.unit})`} keyboardType="decimal-pad" placeholder={units.unit === 'lb' ? 'e.g. 165' : 'e.g. 74.5'} value={kg} onChangeText={setKg} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="Today" active={date === todayKey()} onPress={() => setDate(todayKey())} />
          <Chip label="Yesterday" active={date === addDays(todayKey(), -1)} onPress={() => setDate(addDays(todayKey(), -1))} />
        </View>
        <Text style={ui.muted}>Weigh yourself in the morning, after the toilet and before breakfast. Same time, same way, every time.</Text>
        <Button title="Save" icon="checkmark" disabled={!valid} onPress={save} />
      </Card>

      {entries.length > 0 && (
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle>History</SectionTitle>
          {[...entries].reverse().slice(0, 30).map((e) => (
            <View key={e.date} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Text style={[ui.text, { flex: 1 }]}>{prettyDate(e.date)}</Text>
              <Text style={{ color: Colors.text, fontWeight: '800' }}>{units.text(e.kg)}</Text>
              <Pressable hitSlop={8} onPress={() => dispatch({ type: 'removeBodyWeight', date: e.date })} accessibilityLabel={`Delete ${prettyDate(e.date)}`}>
                <Ionicons name="close" size={18} color={Colors.textFaint} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

const PARTS: { key: Exclude<keyof Measurement, 'date'>; label: string; unit: string }[] = [
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'chest', label: 'Chest', unit: 'cm' },
  { key: 'arms', label: 'Arms', unit: 'cm' },
  { key: 'hips', label: 'Hips', unit: 'cm' },
  { key: 'thighs', label: 'Thighs', unit: 'cm' },
  { key: 'bodyFat', label: 'Body fat', unit: '%' },
];

export function MeasurementsPanel() {
  const { state, dispatch } = useStore();
  const list = state.measurements;
  const last = list[list.length - 1];
  const first = list[0];
  const [values, setValues] = useState<Record<string, string>>({});
  const [chart, setChart] = useState<(typeof PARTS)[number]['key']>('waist');

  const save = () => {
    const entry: Measurement = { date: todayKey() };
    for (const p of PARTS) {
      const v = num(values[p.key] ?? '');
      if (v > 0 && v < 400) entry[p.key] = Math.round(v * 10) / 10;
    }
    if (Object.keys(entry).length === 1) {
      Alert.alert('Fill in at least one measurement');
      return;
    }
    haptics.add();
    dispatch({
      type: 'apply',
      change: (st) => {
        const today = st.measurements.find((m) => m.date === entry.date);
        const merged = { ...today, ...entry };
        return { measurements: [...st.measurements.filter((m) => m.date !== entry.date), merged].sort((a, b) => (a.date < b.date ? -1 : 1)) };
      },
    });
    setValues({});
  };

  const points = list.filter((m) => m[chart] !== undefined).map((m) => ({ label: short(m.date), value: m[chart]! }));

  return (
    <>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Measure today</SectionTitle>
        <Text style={ui.muted}>Measure on bare skin, relaxed, at the same spot every time. Fill in only what you measured.</Text>
        <View style={s.grid}>
          {PARTS.map((p) => (
            <View key={p.key} style={{ width: '47%' }}>
              <Field
                label={`${p.label} (${p.unit})`}
                keyboardType="decimal-pad"
                placeholder={last?.[p.key] !== undefined ? String(last[p.key]) : ''}
                value={values[p.key] ?? ''}
                onChangeText={(v) => setValues((x) => ({ ...x, [p.key]: v }))}
              />
            </View>
          ))}
        </View>
        <Button title="Save measurements" icon="checkmark" onPress={save} />
      </Card>

      {list.length > 0 && (
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle>Progress</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PARTS.filter((p) => list.some((m) => m[p.key] !== undefined)).map((p) => (
              <Chip key={p.key} label={p.label} active={chart === p.key} onPress={() => setChart(p.key)} />
            ))}
          </View>
          <LineChart points={points} unit={chart === 'bodyFat' ? '%' : ' cm'} color={Colors.carbs} />
          {PARTS.map((p) => {
            const now = last?.[p.key];
            const then = first?.[p.key];
            if (now === undefined) return null;
            const diff = then !== undefined && first !== last ? Math.round((now - then) * 10) / 10 : null;
            return (
              <View key={p.key} style={s.row}>
                <Text style={[ui.text, { flex: 1 }]}>{p.label}</Text>
                <Text style={{ color: Colors.text, fontWeight: '800' }}>
                  {now} {p.unit}
                </Text>
                {diff !== null && <Text style={[ui.muted, { width: 70, textAlign: 'right' }]}>{`${diff > 0 ? '+' : ''}${diff} ${p.unit}`}</Text>}
              </View>
            );
          })}
          {first && first !== last && <Text style={ui.muted}>Change since {prettyDate(first.date)}.</Text>}
        </Card>
      )}
    </>
  );
}

const POSES: ProgressPhoto['pose'][] = ['front', 'side', 'back'];

export function PhotosPanel() {
  const { state, dispatch } = useStore();
  const [pose, setPose] = useState<ProgressPhoto['pose']>('front');
  const [compare, setCompare] = useState<string[]>([]);
  const photos = state.progressPhotos.filter((p) => p.pose === pose).sort((a, b) => (a.date < b.date ? 1 : -1));

  const add = (source: 'camera' | 'library') =>
    pickPhoto(source).then(async (uri) => {
      if (!uri) return;
      const id = newId();
      const kept = await keepPhoto(uri, `progress-${id}`);
      haptics.success();
      dispatch({ type: 'apply', change: (st) => ({ progressPhotos: [...st.progressPhotos, { id, date: todayKey(), uri: kept, pose }] }) });
    });

  const remove = (p: ProgressPhoto) =>
    Alert.alert('Delete this photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setCompare((c) => c.filter((x) => x !== p.id));
          dispatch({ type: 'apply', change: (st) => ({ progressPhotos: st.progressPhotos.filter((x) => x.id !== p.id) }) });
        },
      },
    ]);

  const toggle = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));
  const pair = compare.map((id) => state.progressPhotos.find((p) => p.id === id)).filter((p): p is ProgressPhoto => Boolean(p));
  const [before, after] = pair.sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <>
      <Card style={{ gap: Spacing.md }}>
        <Text style={ui.muted}>Photos stay on this phone only. They are never uploaded or shared.</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {POSES.map((p) => (
            <Chip key={p} label={p[0].toUpperCase() + p.slice(1)} active={pose === p} onPress={() => setPose(p)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Take photo" icon="camera" onPress={() => add('camera')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="From gallery" icon="images" variant="ghost" onPress={() => add('library')} />
          </View>
        </View>
      </Card>

      {before && after && (
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle>Before and after</SectionTitle>
          <Compare before={before} after={after} />
          <Text style={ui.muted}>Drag the line to compare.</Text>
        </Card>
      )}

      {photos.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: 28 }}>
          <Ionicons name="body" size={40} color={Colors.textFaint} />
          <Text style={[ui.muted, { textAlign: 'center' }]}>Take a {pose} photo every few weeks, same spot and same light. Seeing the difference keeps you going.</Text>
        </Card>
      ) : (
        <>
          <Text style={ui.muted}>{photos.length >= 2 ? 'Tap two photos to compare them.' : 'Add one more to compare.'}</Text>
          <View style={s.photos}>
            {photos.map((p) => {
              const picked = compare.includes(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggle(p.id)} onLongPress={() => remove(p)} style={[s.thumb, picked && s.thumbPicked]} accessibilityLabel={`Photo from ${prettyDate(p.date)}`}>
                  <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={s.thumbDate}>
                    <Text style={{ color: Colors.text, fontSize: 11, fontWeight: '700' }}>{short(p.date)}</Text>
                  </View>
                  {picked && (
                    <View style={s.thumbCheck}>
                      <Ionicons name="checkmark" size={14} color={Colors.background} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={ui.muted}>Hold a photo to delete it.</Text>
        </>
      )}
    </>
  );
}

/** Before on the left, after on the right; drag the line to slide between them. */
function Compare({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const [width, setWidth] = useState(0);
  const [split, setSplit] = useState(0.5);
  const move = (x: number) => {
    if (width) setSplit(Math.max(0.02, Math.min(0.98, x / width)));
  };

  return (
    <View
      style={s.compare}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => move(e.nativeEvent.locationX)}
      onResponderMove={(e) => move(e.nativeEvent.locationX)}>
      <Image source={{ uri: after.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, { width: width * split, overflow: 'hidden' }]} pointerEvents="none">
        <Image source={{ uri: before.uri }} style={{ width, height: '100%' }} contentFit="cover" />
      </View>
      <View style={[s.handle, { left: width * split - 1 }]} pointerEvents="none">
        <View style={s.knob}>
          <Ionicons name="code" size={16} color={Colors.background} />
        </View>
      </View>
      <Text style={[s.tag, { left: 8 }]} pointerEvents="none">
        {short(before.date)}
      </Text>
      <Text style={[s.tag, { right: 8 }]} pointerEvents="none">
        {short(after.date)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  stat: { flex: 1, padding: 12, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: '31.5%', aspectRatio: 3 / 4, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: Colors.cardRaised, borderWidth: 2, borderColor: 'transparent' },
  thumbPicked: { borderColor: Colors.lime },
  thumbDate: { position: 'absolute', left: 4, bottom: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  thumbCheck: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  compare: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.cardRaised },
  handle: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  knob: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', top: 8, color: Colors.text, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
