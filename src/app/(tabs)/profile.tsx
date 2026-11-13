/** PROFILE — your photo, level, stats and badges, plus calendar, goals, friends, coach and settings. */
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BadgeGrid } from '@/components/BadgeGrid';
import { LevelCard } from '@/components/LevelCard';
import { FadeInCard } from '@/components/motion';
import { Card, Screen, SectionTitle, styles as ui, type IconName } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { pickPhoto } from '@/lib/photos';
import { getMyProfile, setAvatar } from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';
import { currentStreak, isLockedIn } from '@/store/logic';
import { activeDays, badges, levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';

export default function ProfileTab() {
  const { state } = useStore();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const level = levelInfo(totalXp(state));
  const all = badges(state);
  const earned = all.filter((b) => b.earned);
  const lockedDays = activeDays(state).filter((d) => isLockedIn(state, d)).length;
  const km = state.workouts.reduce((t, w) => t + (w.distanceKm ?? 0), 0);

  useFocusEffect(
    useCallback(() => {
      if (cloudEnabled) getMyProfile().then((p) => setAvatarUrl(p.avatar_url)).catch(() => {});
    }, []),
  );

  const changePhoto = () => {
    if (!cloudEnabled) return;
    const run = async (source: 'camera' | 'library') => {
      const uri = await pickPhoto(source, true);
      if (!uri) return;
      setUploading(true);
      try {
        setAvatarUrl(await setAvatar(uri));
      } catch (e) {
        Alert.alert('Oops', e instanceof Error ? e.message : 'Could not update your photo.');
      } finally {
        setUploading(false);
      }
    };
    Alert.alert('Profile picture', 'Friends see this in the feed and ranking.', [
      { text: 'Take photo', onPress: () => run('camera') },
      { text: 'Choose from gallery', onPress: () => run('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Screen
      right={
        <Pressable hitSlop={10} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color={Colors.text} />
        </Pressable>
      }>
      <FadeInCard index={0} style={s.hero}>
        <Pressable onPress={changePhoto} disabled={!cloudEnabled}>
          <Avatar name={state.profile?.name ?? '?'} url={avatarUrl} size={96} highlight />
          {cloudEnabled && (
            <View style={s.camera}>
              {uploading ? <ActivityIndicator size="small" color={Colors.background} /> : <Ionicons name="camera" size={16} color={Colors.background} />}
            </View>
          )}
        </Pressable>
        <Text style={[Type.title, { color: Colors.text }]}>{state.profile?.name}</Text>
        <Text style={{ color: Colors.lime, fontWeight: '800', letterSpacing: 2 }}>
          LVL {level.level} · {level.title.toUpperCase()}
        </Text>
      </FadeInCard>

      <FadeInCard index={1}>
        <LevelCard compact />
      </FadeInCard>

      <FadeInCard index={2} style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <MiniStat icon="flame" value={String(currentStreak(state))} label="day streak" />
        <MiniStat icon="lock-closed" value={String(lockedDays)} label="locked in" />
        <MiniStat icon="barbell" value={String(state.workouts.length)} label="workouts" />
        <MiniStat icon="walk" value={km.toFixed(0)} label="km" />
      </FadeInCard>

      <FadeInCard index={3}>
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle
            action={
              <Pressable onPress={() => router.push('/badges')}>
                <Text style={{ color: Colors.lime, fontWeight: '700' }}>
                  All {all.length} ›
                </Text>
              </Pressable>
            }>
            Badges · {earned.length}
          </SectionTitle>
          <BadgeGrid items={[...earned, ...all.filter((b) => !b.earned)].slice(0, 6)} />
        </Card>
      </FadeInCard>

      <FadeInCard index={4}>
        <Card style={{ padding: 0 }}>
          <Row icon="calendar" title="Calendar" detail="Every day, workout and streak" onPress={() => router.push('/calendar')} />
          <Row icon="stats-chart" title="Week in review" detail="Your week in numbers, ready to share" onPress={() => router.push('/review')} />
          <Row icon="scale" title="Body weight" detail="Log your weight and see the trend" onPress={() => router.push('/body-weight')} />
          <Row icon="options" title="Your goals" detail="Calories, macros, steps, water, sleep" onPress={() => router.push('/goals')} />
          {cloudEnabled && <Row icon="people" title="Friends" detail="Add friends, requests" onPress={() => router.push('/friends')} />}
          {cloudEnabled && <Row icon="clipboard" title="Coach" detail="Share your nutrition with chosen friends" onPress={() => router.push('/coach')} />}
          <Row icon="settings" title="Settings" detail="Profile, Health Connect, reminders, account" onPress={() => router.push('/settings')} last />
        </Card>
      </FadeInCard>
    </Screen>
  );
}

function MiniStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <Card style={s.mini}>
      <Ionicons name={icon} size={16} color={Colors.lime} />
      <Text style={{ color: Colors.text, fontWeight: '900', fontSize: 18 }}>{value}</Text>
      <Text style={[ui.muted, { fontSize: 11 }]}>{label}</Text>
    </Card>
  );
}

function Row({ icon, title, detail, onPress, last }: { icon: IconName; title: string; detail: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && { opacity: 0.6 }]}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ui.text, { fontWeight: '700' }]}>{title}</Text>
        <Text style={ui.muted}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  camera: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  mini: { flex: 1, alignItems: 'center', gap: 2, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.limeSoft, alignItems: 'center', justifyContent: 'center' },
});
