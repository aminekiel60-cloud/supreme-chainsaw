/** SCAN — scan a product barcode, pick a portion and add it to a meal. */
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Field, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { lookupBarcode, portion, type Product } from '@/data/openFoodFacts';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

type Status = 'scanning' | 'loading' | 'found' | 'notFound' | 'error';

export default function ScanScreen() {
  const { dispatch } = useStore();
  const params = useLocalSearchParams<{ meal?: Meal }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<Status>('scanning');
  const [product, setProduct] = useState<Product | null>(null);
  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'Snacks');
  const handled = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (handled.current) return; // the camera fires many times per second
    handled.current = true;
    setStatus('loading');
    try {
      const found = await lookupBarcode(data);
      if (found) {
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

  if (status !== 'found' || !product) {
    return (
      <View style={[s.center, { padding: Spacing.xl, gap: Spacing.lg }]}>
        <Ionicons name="help-circle" size={48} color={Colors.textMuted} />
        <Text style={[ui.text, { textAlign: 'center' }]}>
          {status === 'notFound'
            ? 'This product is not in the Open Food Facts database yet. You can add it by hand.'
            : 'Could not reach the food database. Check your internet connection.'}
        </Text>
        <Button title="Scan again" icon="scan" onPress={scanAgain} />
        <Button title="Add by hand" icon="create" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const g = Number(grams.replace(',', '.')) || 0;
  const n = portion(product, g);

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card style={{ gap: Spacing.sm }}>
        <Text style={[ui.text, { fontSize: 18, fontWeight: '800' }]}>{product.name}</Text>
        <Text style={ui.muted}>
          Per 100 g: {product.per100.kcal} kcal · P {product.per100.protein}g · C {product.per100.carbs}g · F{' '}
          {product.per100.fat}g
        </Text>
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
          dispatch({ type: 'addFood', entry: { name: `${product.name} (${g} g)`, meal, date: todayKey(), ...n } });
          router.dismissTo('/nutrition');
        }}
      />
      <Button title="Scan another" icon="scan" variant="ghost" onPress={scanAgain} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  frame: { width: 260, height: 160, borderRadius: Radius.md, borderWidth: 3, borderColor: Colors.lime },
  hint: { color: Colors.text, fontWeight: '700', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 },
});
