/** SCAN — scan a product barcode, pick a portion and add it to a meal. */
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { portion, type Product } from '@/data/openFoodFacts';
import { addCommunityFood, findProduct, reportCommunityFood } from '@/lib/communityFoods';
import { cloudEnabled } from '@/lib/supabase';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

type Status = 'scanning' | 'loading' | 'found' | 'notFound' | 'error';

export default function ScanScreen() {
  const { dispatch } = useStore();
  const params = useLocalSearchParams<{ meal?: Meal; date?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>('scanning');
  const [product, setProduct] = useState<Product | null>(null);
  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'Snacks');
  const [barcode, setBarcode] = useState('');
  const [adding, setAdding] = useState(false);
  const [incompleteName, setIncompleteName] = useState<string | null>(null);
  const handled = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (handled.current) return; // the camera fires many times per second
    handled.current = true;
    setStatus('loading');
    setBarcode(data);
    try {
      const found = await findProduct(data);
      if (found && !found.complete && cloudEnabled) {
        // Known product, but without a nutrition table: ask for the label values once.
        setIncompleteName(found.name);
        setAdding(true);
        setStatus('notFound');
      } else if (found) {
        setProduct(found);
        setGrams(String(found.servingGrams ?? 100));
        setStatus('found');
      } else {
        setStatus('notFound');
      }
    } catch {
      setStatus('error');
    }
  };

  const scanAgain = () => {
    handled.current = false;
    setProduct(null);
    setAdding(false);
    setIncompleteName(null);
    setStatus('scanning');
  };

  if (!permission) return <View style={s.center} />;

  if (!permission.granted) {
    return (
      <View style={[s.center, { padding: Spacing.xl, gap: Spacing.lg }]}>
        <Ionicons name="camera" size={48} color={Colors.lime} />
        <Text style={[ui.text, { textAlign: 'center' }]}>
          Locked in needs your camera to scan barcodes. Photos are not saved.
        </Text>
        <Button title="Allow camera" icon="checkmark" onPress={requestPermission} />
      </View>
    );
  }

  if (status === 'scanning' || status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={status === 'scanning' ? onScanned : undefined}
        />
        <View style={s.overlay} pointerEvents="none">
          <View style={s.frame} />
          <Text style={s.hint}>{status === 'loading' ? 'Looking up product…' : 'Point at a barcode'}</Text>
          {status === 'loading' && <ActivityIndicator color={Colors.lime} />}
        </View>
      </View>
    );
  }

  if (status === 'notFound' && adding) {
    return (
      <AddProductForm
        barcode={barcode}
        initialName={incompleteName ?? ''}
        reason={
          incompleteName
            ? 'This product is in the database, but without nutrition values. Copy them from the label once and everyone on Locked in gets them.'
            : undefined
        }
        onCancel={() => setAdding(false)}
        onSaved={(p) => {
          setProduct(p);
          setGrams(String(p.servingGrams ?? 100));
          setAdding(false);
          setStatus('found');
        }}
      />
    );
  }

  if (status !== 'found' || !product) {
    return (
      <View style={[s.center, { padding: Spacing.xl, gap: Spacing.lg }]}>
        <Ionicons name="help-circle" size={48} color={Colors.textMuted} />
        <Text style={[ui.text, { textAlign: 'center' }]}>
          {status === 'notFound'
            ? cloudEnabled
              ? "This product isn't in our database yet. Add it once and everyone on Locked in can scan it."
              : 'This product is not in the Open Food Facts database yet. You can add it by hand.'
            : 'Could not reach the food database. Check your internet connection.'}
        </Text>
        {status === 'notFound' && cloudEnabled && (
          <Button title="Add this product" icon="add-circle" onPress={() => setAdding(true)} />
        )}
        <Button title="Scan again" icon="scan" variant="ghost" onPress={scanAgain} />
        <Button title="Add by hand" icon="create" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const report = () =>
    Alert.alert('Report wrong values?', 'If 3 people report this product, it is removed so someone can add it again correctly.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () =>
          reportCommunityFood(product.barcode)
            .then(() => Alert.alert('Thanks!', 'Your report helps keep the food database correct.'))
            .catch((e: Error) => Alert.alert('Oops', e.message)),
      },
    ]);

  const g = Number(grams.replace(',', '.')) || 0;
  const n = portion(product, g);

  return (
    <FormScroll>
      <Card style={{ gap: Spacing.sm }}>
        <Text style={[ui.text, { fontSize: 18, fontWeight: '800' }]}>{product.name}</Text>
        <Text style={ui.muted}>
          Per 100 g: {product.per100.kcal} kcal · P {product.per100.protein}g · C {product.per100.carbs}g · F{' '}
          {product.per100.fat}g
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={ui.muted}>
            {product.source === 'community' ? 'Added by the Locked in community' : 'From Open Food Facts'}
          </Text>
          {product.source === 'community' && (
            <Text onPress={report} style={{ color: Colors.textMuted, textDecorationLine: 'underline', fontSize: 13 }}>
              Report wrong values
            </Text>
          )}
        </View>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Portion</SectionTitle>
        <Field label="Grams" keyboardType="decimal-pad" value={grams} onChangeText={setGrams} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {product.servingGrams && (
            <Chip label={`1 serving (${product.servingGrams} g)`} active={g === product.servingGrams} onPress={() => setGrams(String(product.servingGrams))} />
          )}
          {[50, 100, 200].map((x) => (
            <Chip key={x} label={`${x} g`} active={g === x} onPress={() => setGrams(String(x))} />
          ))}
        </View>
        <Text style={{ color: Colors.lime, fontWeight: '800', fontSize: 18 }}>
          {n.kcal} kcal · P {n.protein}g · C {n.carbs}g · F {n.fat}g
        </Text>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {MEALS.map((m) => (
          <Chip key={m} label={m} active={meal === m} onPress={() => setMeal(m)} />
        ))}
      </View>

      <Button
        title={`Add to ${meal}`}
        icon="checkmark"
        disabled={g <= 0}
        onPress={() => {
          dispatch({ type: 'addFood', entry: { name: `${product.name} (${g} g)`, meal, date: params.date ?? todayKey(), ...n } });
          router.dismissTo('/nutrition');
        }}
      />
      <Button title="Scan another" icon="scan" variant="ghost" onPress={scanAgain} />
    </FormScroll>
  );
}

const num = (v: string) => Number(v.replace(',', '.'));

/** Form to add a product that isn't in any database yet. Values per 100 g, as on the label. */
function AddProductForm({
  barcode,
  initialName,
  reason,
  onCancel,
  onSaved,
}: {
  barcode: string;
  initialName: string;
  reason?: string;
  onCancel: () => void;
  onSaved: (p: Product) => void;
}) {
  const [name, setName] = useState(initialName);
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('');
  const [saving, setSaving] = useState(false);

  const values = [kcal, protein, carbs, fat].map(num);
  const valid =
    name.trim().length > 0 &&
    values.every((v) => Number.isFinite(v) && v >= 0) &&
    values[0] <= 950 &&
    values.slice(1).every((v) => v <= 100) &&
    [kcal, protein, carbs, fat].every((v) => v.trim() !== '');

  const save = async () => {
    setSaving(true);
    try {
      const p = await addCommunityFood({
        barcode,
        name,
        per100: { kcal: values[0], protein: values[1], carbs: values[2], fat: values[3] },
        servingGrams: num(serving) > 0 ? num(serving) : null,
      });
      onSaved(p);
    } catch (e) {
      Alert.alert('Could not add product', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScroll>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>{reason ? 'Complete this product' : 'Add product'}</SectionTitle>
        {reason && <Text style={[ui.text, { color: Colors.lime }]}>{reason}</Text>}
        <Text style={ui.muted}>Copy the values from the nutrition label (per 100 g). Barcode {barcode}</Text>
        <Field label="Product name" placeholder="e.g. Delhaize Skyr Natuur" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="kcal / 100 g" keyboardType="decimal-pad" placeholder="0" value={kcal} onChangeText={setKcal} />
          <Field label="Protein g" keyboardType="decimal-pad" placeholder="0" value={protein} onChangeText={setProtein} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Field label="Carbs g" keyboardType="decimal-pad" placeholder="0" value={carbs} onChangeText={setCarbs} />
          <Field label="Fat g" keyboardType="decimal-pad" placeholder="0" value={fat} onChangeText={setFat} />
        </View>
        <Field label="Serving size in g (optional)" keyboardType="decimal-pad" placeholder="e.g. 150" value={serving} onChangeText={setServing} />
        <Text style={ui.muted}>Shared with everyone on Locked in as soon as you save it.</Text>
      </Card>
      {saving ? (
        <ActivityIndicator color={Colors.lime} />
      ) : (
        <Button title="Save for everyone" icon="people" disabled={!valid} onPress={save} />
      )}
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </FormScroll>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  frame: { width: 260, height: 160, borderRadius: Radius.md, borderWidth: 3, borderColor: Colors.lime },
  hint: { color: Colors.text, fontWeight: '700', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 },
});
