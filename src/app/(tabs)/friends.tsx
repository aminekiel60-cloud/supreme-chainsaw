/** FRIENDS — invite friends, weekly ranking, challenges and the social feed. */
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { DemoFriends } from '@/components/DemoFriends';
import { Badge, Button, Card, Field, ProgressBar, Screen, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import {
  CHALLENGE_PRESETS,
  acceptFriend,
  addFriendByCode,
  createChallenge,
  getFeed,
  getMyProfile,
  joinChallenge,
  listChallenges,
  listFriendships,
  myProgress,
  pointsThisWeek,
  removeFriend,
  setLiked,
  updateMyChallengeProgress,
  type Challenge,
  type Friendship,
  type Post,
  type PublicProfile,
} from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';
import { currentStreak, weekPoints } from '@/store/logic';
import { useStore } from '@/store/store';

export default function FriendsScreen() {
  return cloudEnabled ? <CloudFriends /> : <DemoFriends />;
}

function timeAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${Math.max(1, min)}m ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)}h ago`;
  return `${Math.round(min / 1440)}d ago`;
}

function CloudFriends() {
  const { state } = useStore();
  const [me, setMe] = useState<PublicProfile | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [feed, setFeed] = useState<Post[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [code, setCode] = useState('');
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
    } catch {
      setError('Could not load. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, [state]);

  // Reload every time you open the tab.
  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const outgoing = friendships.filter((f) => f.status === 'pending' && !f.incoming);

  const ranking = [
    ...accepted.map((f) => ({ id: f.friend.id, name: f.friend.display_name, points: pointsThisWeek(f.friend), streak: f.friend.streak })),
    { id: 'me', name: 'You', points: weekPoints(state), streak: currentStreak(state) },
  ].sort((a, b) => b.points - a.points);

  const invite = () =>
    Share.share({
      message: `Lock in with me on Locked in 🔒 Add me with my code: ${me?.invite_code ?? ''}\nLOCK IN. LEVEL UP.`,
    }).catch(() => {});

  const toggleLike = async (p: Post) => {
    setFeed((list) => list.map((x) => (x.id === p.id ? { ...x, likedByMe: !p.likedByMe, likes: x.likes + (p.likedByMe ? -1 : 1) } : x)));
    setLiked(p.id, !p.likedByMe).catch(() => load());
  };

  return (
    <Screen onRefresh={load} refreshing={loading}>
      <Text style={[Type.title, { color: Colors.text }]}>Friends</Text>
      {error && <Text style={{ color: Colors.danger }}>{error}</Text>}

      {/* Invite */}
      <Card highlight style={{ gap: Spacing.md }}>
        <SectionTitle>Your invite code</SectionTitle>
        <Text style={{ color: Colors.lime, fontSize: 32, fontWeight: '900', letterSpacing: 6 }}>{me?.invite_code ?? '······'}</Text>
        <Button title="Invite friends" icon="share-social" onPress={invite} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' }}>
          <Field label="Add a friend by code" placeholder="ABC123" autoCapitalize="characters" value={code} onChangeText={setCode} />
          <Pressable
            disabled={code.trim().length < 6}
            onPress={run(async () => {
              const name = await addFriendByCode(code);
              setCode('');
              return name;
            }, 'Friend request sent!')}
            style={[s.addBtn, code.trim().length < 6 && { opacity: 0.4 }]}>
            <Ionicons name="person-add" size={20} color={Colors.background} />
          </Pressable>
        </View>
      </Card>

      {/* Requests */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle>Requests</SectionTitle>
          {incoming.map((f) => (
            <View key={f.id} style={s.row}>
              <Avatar name={f.friend.display_name} />
              <Text style={[ui.text, { flex: 1, fontWeight: '700' }]}>{f.friend.display_name}</Text>
              <Pressable onPress={run(() => acceptFriend(f.id))} style={s.pill}>
                <Text style={{ color: Colors.background, fontWeight: '800' }}>Accept</Text>
              </Pressable>
              <Pressable hitSlop={10} onPress={run(() => removeFriend(f.id))}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
          ))}
          {outgoing.map((f) => (
            <View key={f.id} style={s.row}>
              <Avatar name={f.friend.display_name} />
              <Text style={[ui.text, { flex: 1 }]}>{f.friend.display_name}</Text>
              <Text style={ui.muted}>Pending</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Ranking */}
      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle action={<Text style={ui.muted}>Resets Monday</Text>}>Weekly ranking</SectionTitle>
        {ranking.length === 1 && <Text style={ui.muted}>Add friends to compete on the weekly leaderboard.</Text>}
        {ranking.map((f, i) => (
          <View key={f.id} style={[s.row, s.rankRow, f.id === 'me' && { backgroundColor: Colors.limeSoft }]}>
            <Text style={[s.rank, i === 0 && { color: Colors.lime }]}>{i + 1}</Text>
            <Avatar name={f.name} me={f.id === 'me'} />
            <View style={{ flex: 1 }}>
              <Text style={[ui.text, { fontWeight: '700' }]}>{f.name}</Text>
              <Text style={ui.muted}>🔥 {f.streak} day streak</Text>
            </View>
            <Text style={{ color: Colors.lime, fontWeight: '800' }}>{f.points} pts</Text>
          </View>
        ))}
      </Card>

      {/* Challenges */}
      <SectionTitle
        action={
          <Pressable onPress={() => setShowPresets(!showPresets)}>
            <Text style={{ color: Colors.lime, fontWeight: '700' }}>{showPresets ? 'Close' : '+ New'}</Text>
          </Pressable>
        }>
        Challenges
      </SectionTitle>
      {showPresets && (
        <Card style={{ gap: Spacing.sm }}>
          <Text style={ui.muted}>Start a 30-day challenge. Your friends can join it.</Text>
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
        return (
          <Card key={c.id} style={{ gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[ui.text, { fontWeight: '700', flex: 1 }]}>{c.title}</Text>
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

      {/* Feed */}
      <SectionTitle>Feed</SectionTitle>
      {feed.length === 0 && (
        <Card>
          <Text style={ui.muted}>Workouts and locked-in days from you and your friends show up here.</Text>
        </Card>
      )}
      {feed.map((post) => (
        <Card key={post.id} style={{ gap: Spacing.md }}>
          <View style={s.row}>
            <Avatar name={post.author} me={post.author === 'You'} />
            <View style={{ flex: 1 }}>
              <Text style={[ui.text, { fontWeight: '700' }]}>{post.author}</Text>
              <Text style={ui.muted}>{timeAgo(post.created_at)}</Text>
            </View>
            {post.kind === 'locked_in' && <Badge text="LOCKED IN" />}
          </View>
          <Text style={[Type.heading, { color: Colors.text }]}>{post.title}</Text>
          {post.stats.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xl }}>
              {post.stats.map((st) => (
                <View key={st.label}>
                  <Text style={ui.statLabel}>{st.label}</Text>
                  <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 16 }}>{st.value}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: Spacing.xl }}>
            <Pressable style={s.action} onPress={() => toggleLike(post)} hitSlop={8}>
              <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={20} color={post.likedByMe ? Colors.lime : Colors.textMuted} />
              <Text style={ui.muted}>{post.likes}</Text>
            </Pressable>
            <Pressable style={s.action} onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id, title: post.title } })} hitSlop={8}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} />
              <Text style={ui.muted}>{post.comments}</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      {accepted.length > 0 && (
        <>
          <SectionTitle>Your friends</SectionTitle>
          <Card style={{ gap: Spacing.sm }}>
            {accepted.map((f) => (
              <View key={f.id} style={s.row}>
                <Avatar name={f.friend.display_name} />
                <Text style={[ui.text, { flex: 1 }]}>{f.friend.display_name}</Text>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Remove friend?', `Remove ${f.friend.display_name} from your friends?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: run(() => removeFriend(f.id)) },
                    ])
                  }>
                  <Ionicons name="person-remove-outline" size={18} color={Colors.textFaint} />
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Avatar({ name, me }: { name: string; me?: boolean }) {
  return (
    <View style={[s.avatar, me && { backgroundColor: Colors.lime }]}>
      <Text style={{ color: me ? Colors.background : Colors.text, fontWeight: '800', fontSize: 12 }}>
        {me ? 'ME' : name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rankRow: { padding: 8, borderRadius: 14 },
  rank: { width: 18, color: Colors.textMuted, fontWeight: '800', textAlign: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  pill: { backgroundColor: Colors.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
