/**
 * The app's page layout, after the Fitbit app: a header with the logo in the
 * middle, three tabs with a pill behind the active icon, big rings, tiles and
 * hero cards. Everything in black and lime.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { ProgressRing } from './ProgressRing';
import type { IconName } from './ui';

/** Header on every tab: watch icon left, logo in the middle, community and your photo right. */
export function AppHeader({ dot }: { dot?: boolean }) {
  const { state } = useStore();
  return (
    <View style={s.header}>
      <Pressable hitSlop={10} onPress={() => router.push('/devices')} accessibilityLabel="Connected devices" style={s.headerSide}>
        <Ionicons name="watch-outline" size={24} color={Colors.text} />
      </Pressable>
      <Logo size={24} />
      <View style={[s.headerSide, { justifyContent: 'flex-end', gap: 16 }]}>
        <Pressable hitSlop={10} onPress={() => router.push('/feed')} accessibilityLabel="Feed">
          <Ionicons name="chatbubbles-outline" size={23} color={Colors.text} />
          {dot && <View style={s.dot} />}
        </Pressable>
        <Pressable hitSlop={8} onPress={() => router.navigate('/you')} accessibilityLabel="Your profile">
          <Avatar name={state.profile?.name ?? '?'} url={state.avatarUrl} size={32} ringLevel={levelInfo(totalXp(state)).level} />
        </Pressable>
      </View>
    </View>
  );
}

/** A tab page: header, then scrolling content with pull-to-refresh. */
export function TabPage({
  children,
  onRefresh,
  refreshing = false,
  dot,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  dot?: boolean;
}) {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader dot={dot} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.lime} colors={[Colors.lime]} /> : undefined
        }>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** A page inside the stack (it has the normal header with a back arrow). */
export function StackPage({
  children,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={s.stackScroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.lime} colors={[Colors.lime]} /> : undefined
      }>
      {children}
    </ScrollView>
  );
}

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ['sunny-outline', 'sunny'],
  coach: ['barbell-outline', 'barbell'],
  you: ['grid-outline', 'grid'],
};

/** Bottom tabs with a lime pill behind the active icon. */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;
        const [outline, filled] = TAB_ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptics.tap();
            navigateToTab(route.key);
          }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={s.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}>
            <View style={[s.pill, focused && s.pillActive]}>
              <Ionicons name={focused ? filled : outline} size={22} color={focused ? Colors.lime : Colors.textMuted} />
            </View>
            <Text style={[s.tabLabel, focused && { color: Colors.text }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A small ring with an icon inside and the number underneath, like Fitbit's stress / sleep / zone rings. */
export function MiniRing({
  icon,
  value,
  label,
  progress,
  color = Colors.lime,
  onPress,
}: {
  icon: IconName;
  value: string;
  label: string;
  progress: number;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={s.miniRing} accessibilityLabel={`${label}: ${value}`}>
      <ProgressRing size={62} stroke={6} progress={progress} color={color}>
        <Ionicons name={icon} size={22} color={color} />
      </ProgressRing>
      <Text style={s.miniValue}>{value}</Text>
      <Text style={s.miniLabel}>{label}</Text>
    </Pressable>
  );
}

/** Section heading with an optional "See all" link on the right. */
export function Section({ title, onSeeAll, seeAllLabel = 'See all' }: { title: string; onSeeAll?: () => void; seeAllLabel?: string }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <Pressable hitSlop={10} onPress={onSeeAll}>
          <Text style={s.seeAll}>{seeAllLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** The tile colours: all dark, each with its own tint, so a row of tiles reads as a set. */
export const TILE_TINTS = {
  lime: ['#2B4A0F', '#14200A'],
  teal: ['#0F3B3A', '#0A1C1C'],
  violet: ['#2C1F4A', '#151022'],
  coral: ['#4A1F1F', '#221010'],
  amber: ['#4A3A0F', '#221B08'],
  blue: ['#10304A', '#0A1622'],
} as const satisfies Record<string, readonly [string, string]>;
export type TileTint = keyof typeof TILE_TINTS;

/** A square tile with a big icon and a label at the bottom (Fitbit's "Collections" and "Community"). */
export function Tile({
  icon,
  label,
  detail,
  tint = 'lime',
  onPress,
  size = 112,
  badge,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  tint?: TileTint;
  onPress: () => void;
  size?: number;
  badge?: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width: size }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]} accessibilityLabel={label}>
      <LinearGradient colors={TILE_TINTS[tint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.tile, { height: size * 1.12 }]}>
        <Ionicons name={icon} size={size * 0.34} color={Colors.lime} style={s.tileIcon} />
        {badge && (
          <View style={s.tileBadge}>
            <Text style={s.tileBadgeText}>{badge}</Text>
          </View>
        )}
        <View>
          <Text style={s.tileLabel} numberOfLines={2}>
            {label}
          </Text>
          {detail && (
            <Text style={s.tileDetail} numberOfLines={1}>
              {detail}
            </Text>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** A big card with a large icon as artwork and a title at the bottom (Fitbit's workout cards). */
export function HeroCard({
  icon,
  kicker,
  title,
  detail,
  tint = 'lime',
  onPress,
  width,
  children,
}: {
  icon: IconName;
  kicker?: string;
  title: string;
  detail?: string;
  tint?: TileTint;
  onPress: () => void;
  width: number;
  children?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width }, pressed && { opacity: 0.85 }]} accessibilityLabel={title}>
      <LinearGradient colors={TILE_TINTS[tint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <Ionicons name={icon} size={150} color="rgba(163, 255, 63, 0.16)" style={s.heroArt} />
        <View style={{ gap: 6 }}>
          {kicker && <Text style={s.heroKicker}>{kicker}</Text>}
          <Text style={s.heroTitle}>{title}</Text>
          {detail && <Text style={s.heroDetail}>{detail}</Text>}
          {children}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** A small rounded label with an icon, used instead of "a · b · c" text. */
export function Pill({ icon, text, active, style }: { icon?: IconName; text: string; active?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.pillTag, active && s.pillTagActive, style]}>
      {icon && <Ionicons name={icon} size={14} color={active ? Colors.background : Colors.lime} />}
      <Text style={[s.pillTagText, active && { color: Colors.background }]}>{text}</Text>
    </View>
  );
}

/** A tappable list row: icon, title, one line of detail, chevron. */
export function ListRow({
  icon,
  title,
  detail,
  onPress,
  last,
  right,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onPress: () => void;
  last?: boolean;
  right?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && { opacity: 0.6 }]}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {detail ? <Text style={s.rowDetail}>{detail}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />}
    </Pressable>
  );
}

/** Your current level, for avatars. */
export function useMyLevel() {
  const { state } = useStore();
  return levelInfo(totalXp(state)).level;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerSide: { width: 90, flexDirection: 'row', alignItems: 'center' },
  dot: { position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.lime, borderWidth: 2, borderColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: 4, paddingBottom: 40, gap: Spacing.lg },
  stackScroll: { padding: Spacing.lg, paddingBottom: 60, gap: Spacing.lg },

  tabBar: { flexDirection: 'row', backgroundColor: '#0B0B0B', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  pill: { width: 64, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: Colors.limeSoft },
  tabLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },

  miniRing: { flex: 1, alignItems: 'center', gap: 4 },
  miniValue: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  miniLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  seeAll: { color: Colors.lime, fontWeight: '700' },

  tile: { borderRadius: Radius.md, padding: 12, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tileIcon: { position: 'absolute', top: 12, right: 10 },
  tileLabel: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  tileDetail: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  tileBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: Colors.lime, borderRadius: 9, paddingHorizontal: 6, height: 18, justifyContent: 'center' },
  tileBadgeText: { color: Colors.background, fontSize: 11, fontWeight: '900' },

  hero: { height: 240, borderRadius: Radius.lg, padding: 18, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(163,255,63,0.18)' },
  heroArt: { position: 'absolute', top: 6, right: -14 },
  heroKicker: { color: Colors.lime, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: Colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  heroDetail: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },

  pillTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: Colors.cardRaised, borderWidth: 1, borderColor: Colors.border, alignSelf: 'flex-start' },
  pillTagActive: { backgroundColor: Colors.lime, borderColor: Colors.lime },
  pillTagText: { color: Colors.text, fontWeight: '700', fontSize: 13 },

  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.limeSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  rowDetail: { color: Colors.textMuted, fontSize: 13, marginTop: 1 },
});
