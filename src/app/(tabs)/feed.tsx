/** FEED — your friends' activity, the weekly ranking and challenges. */
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { DemoFriends } from '@/components/DemoFriends';
import { FadeInCard } from '@/components/motion';
import { PostCard, feedStyles } from '@/components/PostCard';
import { Button, Card, ProgressBar, Screen, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import {
  CHALLENGE_PRESETS,
  createChallenge,
  getFeed,
  getMyProfile,
  joinChallenge,
  listChallenges,
  listFriendships,
  myProgress,
  pointsThisWeek,
  setLiked,
  updateMyChallengeProgress,
  type Challenge,
  type Friendship,
  type Post,
  type PublicProfile,
} from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';
import { todayKey } from '@/store/dates';
import { currentStreak, weekPoints } from '@/store/logic';
import { levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';

type Section = 'activity' | 'ranking' | 'challenges';

export default function FeedScreen() {
  return cloudEnabled ? <CloudFeed /> : <DemoFriends />;
}

function CloudFeed() {
  const { state, dispatch } = useStore();
  const [section, setSection] = useState<Section>('activity');
  const [me, setMe] = useState<PublicProfile | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [feed, setFeed] = useState<Post[] | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, fs, posts, chs] = await Promise.all([getMyProfile(), listFriendships(), getFeed(), listChallenges()]);
      setMe(profile);
      setFriendships(fs);
      setFeed(posts);
      setChallenges(chs);
      updateMyChallengeProgress(state, chs).catch(() => {});
      // Record challenges you've completed (for badges and XP).
      for (const c of chs) {
        if (c.members.some((m) => m.name === 'You') && myProgress(state, c) >= c.target) {
          dispatch({ type: 'winChallenge', id: c.id, title: c.title, date: todayKey() });
        }
      }
    } catch {
      setError('Could not load. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, [state, dispatch]);

  // Reload every time the tab opens, always with your latest data.
  const loadRef = useRef(load);
  loadRef.current = load;
  useFocusEffect(
    useCallback(() => {
      loadRef.current();
    }, []),
  );

  const run = (action: () => Promise<unknown>, success?: string) => async () => {
    try {
      await action();
      if (success) Alert.alert(success);
      await load();
    } catch (e) {
      Alert.alert('Oops', e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const accepted = friendships.filter((f) => f.status === 'accepted');
  const incoming = friendships.filter((f) => f.status === 'pending' && f.incoming);
  const myLevel = levelInfo(totalXp(state)).level;

  const ranking = [
    ...accepted.map((f) => ({
      id: f.friend.id,
      name: f.friend.display_name,
      avatar: f.friend.avatar_url,
      level: f.friend.level,
      points: pointsThisWeek(f.friend),
      streak: f.friend.streak,
    })),
    { id: 'me', name: 'You', avatar: me?.avatar_url ?? null, level: myLevel, points: weekPoints(state), streak: currentStreak(state) },
  ].sort((a, b) => b.points - a.points);

  const toggleLike = (p: Post) => {
    setFeed((list) => (list ?? []).map((x) => (x.id === p.id ? { ...x, likedByMe: !p.likedByMe, likes: x.likes + (p.likedByMe ? -1 : 1) } : x)));
    setLiked(p.id, !p.likedByMe).catch(() => load());
  };

  return (
    <Screen
      onRefresh={load}
      refreshing={loading}
      right={
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable hitSlop={10} onPress={() => router.push('/coach')}>
            <Ionicons name="clipboard-outline" size={23} color={Colors.text} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => router.push('/friends')}>
            <Ionicons name="person-add-outline" size={23} color={Colors.text} />
            {incoming.length > 0 && <View style={s.dot} />}
          </Pressable>
        </View>
      }>
      <Text style={[Type.title, { color: Colors.text }]}>Feed</Text>

      <View style={feedStyles.segment}>
        {(['activity', 'ranking', 'challenges'] as Section[]).map((sec) => (
          <Pressable key={sec} onPress={() => setSection(sec)} style={[feedStyles.segmentItem, section === sec && feedStyles.segmentActive]}>
            <Text style={{ color: section === sec ? Colors.background : Colors.text, fontWeight: '800', textTransform: 'capitalize' }}>{sec}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={{ color: Colors.danger }}>{error}</Text>}

      {incoming.length > 0 && (
        <Pressable onPress={() => router.push('/friends')}>
          <Card highlight style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Ionicons name="person-add" size={20} color={Colors.lime} />
            <Text style={[ui.text, { flex: 1, fontWeight: '700' }]}>
              {incoming.length} friend request{incoming.length > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.lime} />
          </Card>
        </Pressable>
      )}

      {section === 'activity' && (
        <>
          {feed !== null && feed.length === 0 && (
            <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: 28 }}>
              <Ionicons name="people" size={40} color={Colors.lime} />
              <Text style={[ui.text, { textAlign: 'center', fontWeight: '700' }]}>Your feed is waiting for friends</Text>
              <Text style={[ui.muted, { textAlign: 'center' }]}>Workouts and locked-in days from you and your friends show up here.</Text>
              <Button title="Add friends" icon="person-add" onPress={() => router.push('/friends')} />
            </Card>
          )}
          {(feed ?? []).map((post, i) => (
            <FadeInCard key={post.id} index={Math.min(i, 5)}>
              <PostCard post={post} onLike={() => toggleLike(post)} />
            </FadeInCard>
          ))}
        </>
      )}

      {section === 'ranking' && (
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle action={<Text style={ui.muted}>Resets Monday</Text>}>This week</SectionTitle>
          {ranking.length === 1 && <Text style={ui.muted}>Add friends to compete on the weekly leaderboard.</Text>}
          {ranking.map((f, i) => (
            <View key={f.id} style={[s.rankRow, f.id === 'me' && { backgroundColor: Colors.limeSoft }]}>
              <Text style={[s.rank, i === 0 && { color: Colors.lime }]}>{i === 0 ? '👑' : i + 1}</Text>
              <Avatar name={f.name} url={f.avatar} level={f.level} highlight={f.id === 'me'} />
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontWeight: '800' }]}>{f.name}</Text>
                <Text style={ui.muted}>🔥 {f.streak} day streak</Text>
              </View>
              <Text style={{ color: Colors.lime, fontWeight: '900', fontSize: 16 }}>{f.points}</Text>
            </View>
          ))}
        </Card>
      )}

      {section === 'challenges' && (
        <>
          <Button title={showPresets ? 'Close' : 'New challenge'} icon={showPresets ? 'close' : 'flag'} variant="ghost" onPress={() => setShowPresets(!showPresets)} />
          {showPresets && (
            <Card style={{ gap: Spacing.sm }}>
              <Text style={ui.muted}>Start a 30-day challenge. Your friends can join it. Winning earns a badge and +250 XP.</Text>
              {CHALLENGE_PRESETS.map((p) => (
                <Button
                  key={p.metric}
                  title={p.title}
                  variant="ghost"
                  onPress={run(async () => {
                    await createChallenge(p);
                    setShowPresets(false);
                  }, 'Challenge started!')}
                />
              ))}
            </Card>
          )}
          {challenges.length === 0 && !showPresets && (
            <Card>
              <Text style={ui.muted}>No challenges yet. Start one and invite your friends.</Text>
            </Card>
          )}
          {challenges.map((c) => {
            const joined = c.members.some((m) => m.name === 'You');
            const mine = myProgress(state, c);
            const unit = CHALLENGE_PRESETS.find((p) => p.metric === c.metric)?.unit ?? '';
            const won = state.challengeWins.some((w) => w.id === c.id);
            return (
              <Card key={c.id} highlight={won} style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[ui.text, { fontWeight: '800', flex: 1 }]}>
                    {won ? '🏆 ' : ''}
                    {c.title}
                  </Text>
                  <Text style={ui.muted}>until {c.end_date.slice(5).split('-').reverse().join('/')}</Text>
                </View>
                {joined && <ProgressBar progress={mine / c.target} />}
                {c.members.map((m) => (
                  <View key={m.user_id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={ui.text}>{m.name}</Text>
                    <Text style={{ color: Colors.lime, fontWeight: '700' }}>
                      {m.name === 'You' ? mine : m.progress} / {c.target} {unit}
                    </Text>
                  </View>
                ))}
                {!joined && <Button title="Join challenge" icon="flag" variant="ghost" onPress={run(() => joinChallenge(c.id))} />}
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  dot: { position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.lime },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 8, borderRadius: 14 },
  rank: { width: 24, color: Colors.textMuted, fontWeight: '900', textAlign: 'center' },
});
