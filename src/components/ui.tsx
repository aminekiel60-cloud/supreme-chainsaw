/**
 * Small reusable building blocks so every screen looks consistent.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { Logo } from './Logo';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Scrollable page with the logo header. */
export function Screen({
  children,
  right,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  right?: ReactNode;
  /** Enables pull-to-refresh */
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.lime} colors={[Colors.lime]} />
          ) : undefined
        }>
        <View style={styles.header}>
          <Logo />
          {right}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  highlight,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  highlight?: boolean;
}) {
  return <View style={[styles.card, highlight && styles.cardHighlight, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

/** A bar that grows smoothly to its new value. */
export function ProgressBar({ progress, color = Colors.lime }: { progress: number; color?: string }) {
  const target = Math.max(0, Math.min(1, progress)) * 100;
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [target, width]);
  const animated = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { backgroundColor: color }, animated]} />
    </View>
  );
}

export function Button({
  title,
  icon,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  icon?: IconName;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonGhost,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
      ]}>
      {icon && <Ionicons name={icon} size={18} color={primary ? Colors.background : Colors.lime} />}
      <Text style={[styles.buttonText, { color: primary ? Colors.background : Colors.lime }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
    </Card>
  );
}

export function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <TextInput placeholderTextColor={Colors.textFaint} style={styles.input} {...props} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: Colors.background }]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  cardHighlight: { borderColor: Colors.limeBorder, backgroundColor: '#18200F' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...Type.heading, color: Colors.text },
  barTrack: { height: 8, borderRadius: Radius.pill, backgroundColor: Colors.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.pill },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
  buttonPrimary: { backgroundColor: Colors.lime },
  buttonGhost: { borderWidth: 1, borderColor: Colors.limeBorder, backgroundColor: Colors.limeSoft },
  buttonText: { fontSize: 15, fontWeight: '700' },
  stat: { flex: 1, padding: Spacing.md, gap: 2 },
  statLabel: { ...Type.label, color: Colors.textMuted },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.lime },
  statUnit: { fontSize: 12, color: Colors.textMuted },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  input: {
    backgroundColor: Colors.cardRaised,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipActive: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  chipText: { color: Colors.text, fontWeight: '600' },
  muted: { color: Colors.textMuted, fontSize: 13 },
  text: { color: Colors.text, fontSize: 15, fontWeight: '500' },
});
