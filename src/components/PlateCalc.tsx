/** Plate calculator: which plates go on each side of the bar for a given weight. */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { platesPerSide } from '@/store/exercises';
import { Button, Chip, Field, styles as ui } from './ui';

const PLATE_COLORS: Record<number, string> = { 25: '#E53935', 20: '#1E88E5', 15: '#FDD835', 10: '#43A047', 5: '#EEEEEE', 2.5: '#9E9E9E', 1.25: '#757575' };

export function PlateCalc({ weight, onClose }: { weight: number; onClose: () => void }) {
  const [text, setText] = useState(String(weight || ''));
  const [bar, setBar] = useState(20);
  const total = Number(text.replace(',', '.')) || 0;
  const plates = total > bar ? platesPerSide(total, bar) : [];
  const loaded = bar + plates.reduce((t, p) => t + p, 0) * 2;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={[Type.heading, { color: Colors.text }]}>Plate calculator</Text>
          <Field label="Total weight (kg)" keyboardType="decimal-pad" value={text} onChangeText={setText} autoFocus />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {[20, 15, 10].map((b) => (
              <Chip key={b} label={`${b} kg bar`} active={bar === b} onPress={() => setBar(b)} />
            ))}
          </View>
          <View style={s.barRow}>
            <View style={s.barEnd} />
            {plates.map((p, i) => (
              <View key={i} style={[s.plate, { backgroundColor: PLATE_COLORS[p] ?? Colors.textMuted, height: 28 + Math.min(p, 25) * 2 }]}>
                <Text style={s.plateText}>{p}</Text>
              </View>
            ))}
            <View style={s.barShaft} />
          </View>
          <Text style={ui.text}>
            {total <= bar
              ? 'Just the bar'
              : `Per side: ${plates.join(' + ')} kg.${loaded !== total ? ` That makes ${loaded} kg, the closest you can load.` : ''}`}
          </Text>
          <Button title="Done" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md, paddingBottom: 40 },
  barRow: { flexDirection: 'row', alignItems: 'center', height: 90, gap: 3 },
  barEnd: { width: 10, height: 20, backgroundColor: '#9E9E9E', borderRadius: 3 },
  barShaft: { flex: 1, height: 10, backgroundColor: '#9E9E9E', borderRadius: 5 },
  plate: { width: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  plateText: { color: '#111', fontSize: 9, fontWeight: '900' },
});
