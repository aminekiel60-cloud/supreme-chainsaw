/** AI PHOTO — photograph your meal; AI estimates the foods, portions and macros. */
import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { cloudEnabled, db } from '@/lib/supabase';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

type Item = { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number };
type Result = { items: Item[]; confidence: 'low' | 'medium' | 'high'; note: string; remainingToday: number };
type Row = Item & { include: boolean; gramsText: string };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Scale an AI estimate to the grams you typed. */
function scaled(r: Row) {
  const f = r.grams > 0 ? (Number(r.gramsText.replace(',', '.')) || 0) / r.grams : 0;
  return { kcal: Math.round(r.kcal * f), protein: round1(r.protein * f), carbs: round1(r.carbs * f), fat: round1(r.fat * f) };
}

export default function PhotoScreen() {
  const { dispatch } = useStore();
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'Lunch');
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    const perm =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission needed to use your ' + (source === 'camera' ? 'camera.' : 'photos.'));
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const picked = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (picked.canceled) return;
    setUri(picked.assets[0].uri);
    analyse(picked.assets[0].uri);
  };

  const analyse = async (photo: string) => {
    setBusy(true);
    setResult(null);
    try {
      // Shrink to 1024 px wide: plenty for recognition, fast to upload.
      const image = await ImageManipulator.manipulate(photo).resize({ width: 1024 }).renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      const { data, error: fnError } = await db().functions.invoke<Result>('food-photo', { body: { image: saved.base64 } });
      if (fnError) {
        // The function puts a friendly message in the response body.
        const body = await (fnError as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? 'Could not analyse this photo.');
      }
      setResult(data!);
      setRows(data!.items.map((i) => ({ ...i, include: true, gramsText: String(Math.round(i.grams)) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const addAll = () => {
    for (const r of rows.filter((x) => x.include)) {
      const grams = Number(r.gramsText.replace(',', '.')) || 0;
      const per100 = (v: number) => (r.grams > 0 ? Math.round((v / r.grams) * 1000) / 10 : 0);
      dispatch({
        type: 'addFood',
        entry: {
          name: r.name,
          meal,
          date: params.date ?? todayKey(),
          ...scaled(r),
          base: { amount: grams, unit: 'g', kcal: per100(r.kcal), protein: per100(r.protein), carbs: per100(r.carbs), fat: per100(r.fat) },
        },
      });
    }
    router.dismissTo('/nutrition');
  };

  if (!cloudEnabled) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, padding: 24, justifyContent: 'center' }}>
        <Text style={[ui.text, { textAlign: 'center' }]}>AI photo recognition needs an account. It will be available once accounts are set up.</Text>
      </View>
    );
  }

  const included = rows.filter((r) => r.include).map(scaled);
  const total = included.reduce((t, n) => t + n.kcal, 0);

  return (
    <FormScroll>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 20 }} />
      ) : (
        <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: 32 }}>
          <Ionicons name="camera" size={48} color={Colors.lime} />
          <Text style={[ui.text, { textAlign: 'center' }]}>Take a photo of your meal. AI estimates the foods, portions and macros.</Text>
        </Card>
      )}

      {!busy && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title={uri ? 'Retake' : 'Take photo'} icon="camera" onPress={() => pick('camera')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="From gallery" icon="images" variant="ghost" onPress={() => pick('library')} />
          </View>
        </View>
      )}

      {busy && (
        <Card style={{ alignItems: 'center', gap: Spacing.sm }}>
          <ActivityIndicator color={Colors.lime} />
          <Text style={ui.muted}>Analysing your meal…</Text>
        </Card>
      )}
      {error && <Text style={{ color: Colors.danger, textAlign: 'center' }}>{error}</Text>}

      {result && (
        <>
          <Card style={{ gap: Spacing.md }}>
            <SectionTitle action={<Text style={ui.muted}>{result.confidence} confidence</Text>}>Found</SectionTitle>
            {rows.length === 0 && <Text style={ui.muted}>{result.note}</Text>}
            {rows.map((r, i) => {
              const n = scaled(r);
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, opacity: r.include ? 1 : 0.4 }}>
                  <Pressable hitSlop={8} onPress={() => setRows(rows.map((x, j) => (j === i ? { ...x, include: !x.include } : x)))}>
                    <Ionicons name={r.include ? 'checkbox' : 'square-outline'} size={22} color={Colors.lime} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={[ui.text, { fontWeight: '700' }]}>{r.name}</Text>
                    <Text style={ui.muted}>
                      {n.kcal} kcal, {n.protein} g protein, {n.carbs} g carbs, {n.fat} g fat
                    </Text>
                  </View>
                  <TextInput
                    style={[ui.input, { width: 70, paddingVertical: 6, textAlign: 'right' }]}
                    keyboardType="numeric"
                    value={r.gramsText}
                    onChangeText={(t) => setRows(rows.map((x, j) => (j === i ? { ...x, gramsText: t } : x)))}
                  />
                  <Text style={ui.muted}>g</Text>
                </View>
              );
            })}
            {rows.length > 0 && <Text style={ui.muted}>{result.note} Adjust the grams if needed.</Text>}
          </Card>

          {rows.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {MEALS.map((m) => (
                  <Chip key={m} label={m} active={meal === m} onPress={() => setMeal(m)} />
                ))}
              </View>
              <Button title={`Add ${total} kcal to ${meal}`} icon="checkmark" disabled={included.length === 0} onPress={addAll} />
            </>
          )}
          <Text style={[ui.muted, { textAlign: 'center' }]}>{result.remainingToday} AI photos left today</Text>
        </>
      )}
    </FormScroll>
  );
}
