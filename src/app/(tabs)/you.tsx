/** YOU: your profile, community (feed, friends, challenges), progress and reports, settings. */
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, LEVEL_TIERS } from '@/components/Avatar';
import { ListRow, Section, TabPage, Tile } from '@/components/layout';
import { FadeInCard } from '@/components/motion';
import { Card, ProgressBar, styles as ui, type IconName } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { pickPhoto } from '@/lib/photos';
import { getMyProfile, listFriendships, setAvatar } from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';
import { fromKey } from '@/store/dates';
import { currentStreak, isLockedIn } from '@/store/logic';
import { activeDays, badges, levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';

export default function YouScreen() {
  const { state, dispatch } = useStore();
  const [uploading, setUploading] = useState(false);
  const [requests, setRequests] = useState(0);
  const xp = totalXp(state);
  const level = levelInfo(xp);
  const nextTier = [...LEVEL_TIERS].reverse().find((tier) => tier.from > level.level);
  const all = badges(state);
  const earned = all.filter((b) => b.earned).length;
  const days = activeDays(state);
  const lockedDays = days.filter((d) => isLockedIn(state, d)).length;
  const km = state.workouts.reduce((t, w) => t + (w.distanceKm ?? 0), 0);
  const since = days.length ? fromKey(days[0]).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null;

  useFocusEffect(
    useCallback(() => {
      if (!cloudEnabled) return;
      getMyProfile()
        .then((p) => {
          if (p.avatar_url !== state.avatarUrl) dispatch({ type: 'apply', change: () => ({ avatarUrl: p.avatar_url }) });
        })
        .catch(() => {});
      listFriendships()
        .then((fs) => setRequests(fs.filter((f) => f.status === 'pending' && f.incoming).length))
        .catch(() => {});
    }, [state.avatarUrl, dispatch]),
  );

  const changePhoto = () => {
    if (!cloudEnabled) return;
    const run = async (source: 'camera' | 'library') => {
      const uri = await pickPhoto(source, true);
      if (!uri) return;
      setUploading(true);
      try {
        const url = await setAvatar(uri);
        dispatch({ type: 'apply', change: () => ({ avatarUrl: url }) });
      } catch (e) {
        Alert.alert('Could not update your photo', e instanceof Error ? e.message : 'Check your connection and try again.');
      } finally {
        setUploading(false);
      }
    };
    Alert.alert('Profile picture', 'Friends see this in the feed and the ranking.', [
      { text: 'Take photo', onPress: () => run('camera') },
      { text: 'Choose from gallery', onPress: () => run('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TabPage dot={requests > 0}>
      {/* Profile card */}
      <FadeInCard index={0}>
        <Card style={{ gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
            <Pressable onPress={changePhoto} disabled={!cloudEnabled} accessibilityLabel="Change profile picture">
              <Avatar name={state.profile?.name ?? '?'} url={state.avatarUrl} size={76} ringLevel={level.level} />
              {cloudEnabled && (
                <View style={s.camera}>
                  {uploading ? <ActivityIndicator size="small" color={Colors.background} /> : <Ionicons name="camera" size={14} color={Colors.background} />}
                </View>
              )}
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[Type.title, { color: Colors.text }]} numberOfLines={1}>
                {state.profile?.name}
              </Text>
              <Text style={ui.muted}>{since ? `Training since ${since}` : 'Just getting started'}</Text>
              <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
                <Text style={{ color: Colors.lime, fontWeight: '700', marginTop: 2 }}>Edit profile</Text>
              </Pressable>
            </View>
          </View>
          <Pressable onPress={() => router.push('/badges')} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: Colors.lime, fontWeight: '900', letterSpacing: 1 }}>LEVEL {level.level}</Text>
              <Text style={ui.muted}>{level.title}</Text>
            </View>
            <ProgressBar progress={level.progress} />
            <Text style={ui.muted}>
              {(level.needed - level.intoLevel).toLocaleString('en-US')} XP to level {level.level + 1}.{' '}
              {nextTier ? `${nextTier.name} border at level ${nextTier.from}.` : 'You have the Legend border.'}
            </Text>
          </Pressable>
        </Card>
      </FadeInCard>

      <FadeInCard index={1} style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <MiniStat icon="flame" value={String(currentStreak(state))} label="day streak" />
        <MiniStat icon="lock-closed" value={String(lockedDays)} label="locked in" />
        <MiniStat icon="barbell" value={String(state.workouts.length)} label="workouts" />
        <MiniStat icon="navigate" value={km.toFixed(0)} label="km" />
      </FadeInCard>

      <Section title="Community" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.lg }} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: 10 }}>
        <Tile icon="newspaper" label="Feed" detail="Friends and For You" tint="teal" onPress={() => router.push('/feed')} />
        <Tile icon="people" label="Friends" detail="Invite and add" tint="violet" badge={requests ? String(requests) : undefined} onPress={() => router.push('/friends')} />
        <Tile icon="shield" label="Clubs" detail="Your gym, your team" tint="lime" onPress={() => router.push('/clubs')} />
        <Tile icon="flag" label="Challenges" detail="30 days with friends" tint="coral" onPress={() => router.push('/challenges')} />
        <Tile icon="podium" label="Ranking" detail="Points this week" tint="amber" onPress={() => router.push({ pathname: '/challenges', params: { tab: 'ranking' } })} />
      </ScrollView>

      <Section title="Progress and reports" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.lg }} contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: 10 }}>
        <Tile icon="stats-chart" label="Week in review" detail="Ready to share" onPress={() => router.push('/review')} />
        <Tile icon="sparkles" label="Year in review" detail={`Your ${new Date().getFullYear()}`} tint="coral" onPress={() => router.push('/year')} />
        <Tile icon="body" label="Body" detail="Weight, sizes, photos" tint="blue" onPress={() => router.push('/body')} />
        <Tile icon="trophy" label="Records" detail="Best lifts" tint="amber" onPress={() => router.push('/records')} />
        <Tile icon="calendar" label="Calendar" detail="Every day" tint="teal" onPress={() => router.push('/calendar')} />
        <Tile icon="ribbon" label="Badges" detail={`${earned} of ${all.length}`} tint="violet" onPress={() => router.push('/badges')} />
      </ScrollView>

      <Section title="Your plan" />
      <Card style={{ padding: 0 }}>
        <ListRow icon="options" title="Goals" detail="Calories, macros, steps, water, training days" onPress={() => router.push('/goals')} />
        <ListRow icon="cart" title="Grocery list" detail="Tick things off in the shop" onPress={() => router.push('/grocery')} />
        <ListRow icon="cloud-upload" title="Import workouts" detail="From Strong or Hevy" onPress={() => router.push('/import')} />
        <ListRow icon="watch" title="Connected devices" detail="Garmin, Polar, Samsung, Fitbit and more" onPress={() => router.push('/devices')} />
        {cloudEnabled && <ListRow icon="clipboard" title="Coach access" detail="Let a friend see your food and training" onPress={() => router.push('/coach-access')} />}
        <ListRow icon="settings" title="Settings" detail="Profile, reminders, privacy, account" onPress={() => router.push('/settings')} last />
      </Card>
    </TabPage>
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

const s = StyleSheet.create({
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.card,
  },
  mini: { flex: 1, alignItems: 'center', gap: 2, padding: 10, borderRadius: Radius.md },
});
