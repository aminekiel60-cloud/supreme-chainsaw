/**
 * The + in the middle of the tab bar: one place to log anything.
 * Food, barcode, workout, run, water, weight and a feed post.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { cloudEnabled } from '@/lib/supabase';
import { startWorkout } from '@/lib/workouts';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';
import type { IconName } from './ui';

function mealNow(): Meal {
  const h = new Date().getHours();
  if (h < 10) return 'Breakfast';
  if (h < 15) return 'Lunch';
  if (h < 21) return 'Dinner';
  return 'Snacks';
}

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const water = state.water[today] ?? 0;

  const go = (fn: () => void) => () => {
    haptics.tap();
    onClose();
    fn();
  };

  const items: { icon: IconName; label: string; detail: string; onPress: () => void; hidden?: boolean }[] = [
    { icon: 'restaurant', label: 'Food', detail: mealNow(), onPress: go(() => router.push({ pathname: '/add-food', params: { meal: mealNow(), date: today } })) },
    { icon: 'barcode', label: 'Scan', detail: 'Barcode', onPress: go(() => router.push({ pathname: '/scan', params: { meal: mealNow(), date: today } })) },
    {
      icon: state.activeWorkout ? 'play' : 'barbell',
      label: state.activeWorkout ? 'Resume' : 'Workout',
      detail: state.activeWorkout ? 'In progress' : 'Empty workout',
      onPress: go(() => {
        if (!state.activeWorkout) startWorkout(state, dispatch);
        router.push('/active-workout');
      }),
    },
    { icon: 'navigate', label: 'Run', detail: 'GPS tracking', onPress: go(() => router.push('/run')) },
    {
      icon: 'water',
      label: 'Water',
      detail: `+${state.settings.bottleMl} ml, now ${(water / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} L`,
      onPress: () => {
        haptics.add();
        dispatch({ type: 'addWater', date: today, ml: state.settings.bottleMl });
        onClose();
      },
    },
    { icon: 'scale', label: 'Weight', detail: 'Body weight', onPress: go(() => router.push('/body-weight')) },
    { icon: 'camera', label: 'Post', detail: 'To the feed', onPress: go(() => router.push('/new-post')), hidden: !cloudEnabled },
    { icon: 'create', label: 'Past workout', detail: 'Log afterwards', onPress: go(() => router.push('/log-workout')) },
  ];

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 24 }]} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.title}>Log something</Text>
          <View style={s.grid}>
            {items
              .filter((i) => !i.hidden)
              .map((i) => (
                <Pressable key={i.label} onPress={i.onPress} style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]} accessibilityLabel={i.label}>
                  <View style={s.icon}>
                    <Ionicons name={i.icon} size={24} color={Colors.background} />
                  </View>
                  <Text style={s.label}>{i.label}</Text>
                  <Text style={s.detail} numberOfLines={1}>
                    {i.detail}
                  </Text>
                </Pressable>
              ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md, borderTopWidth: 1, borderColor: Colors.border },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  title: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { width: '23%', flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.cardRaised },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.text, fontWeight: '800', fontSize: 13 },
  detail: { color: Colors.textMuted, fontSize: 10, paddingHorizontal: 4 },
});
