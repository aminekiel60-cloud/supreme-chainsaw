/** CHALLENGES and RANKING: 30-day challenges with friends (or everyone), and this week's points. */
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Pill, Section, StackPage } from '@/components/layout';
import { FadeInCard } from '@/components/motion';
import { Button, Card, Chip, ProgressBar, styles as ui } from '@/components/ui';
import { feedStyles } from '@/components/PostCard';
import { Colors, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import {
  CHALLENGE_PRESETS,
  createChallenge,
  deleteChallenge,
  getMyProfile,
  joinChallenge,
  leaveChallenge,
  listChallenges,
  listFriendships,
  myProgress,
  pointsThisWeek,
  updateMyChallengeProgress,
  type Challenge,
  type Friendship,
  type PublicProfile,
  type Visibility,
} from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';
import { fromKey, todayKey } from '@/store/dates';
import { currentStreak, weekPoints } from '@/store/logic';
import { levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';

type Tab = 'challenges' | 'ranking';

const endLabel = (date: string) => {
  const end = fromKey(date);
  const days = Math.round((end.getTime() - fromKey(todayKey()).getTime()) / 86400000);
  if (days < 0) return 'Finished';
  if (days === 0) return 'Ends today';
  return days === 1 ? '1 day left' : `${days} days left`;
};

export default function ChallengesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'ranking' ? 'ranking' : 'challenges');

  if (!cloudEnabled) {
    return (
      <StackPage>
        <Card>
          <Text style={ui.muted}>Challenges need an account. Sign in to compete with friends.</Text>
        </Card>
      </StackPage>
    );
  }

  return (
    <StackPage>
      <View style={feedStyles.segment}>
        {(['challenges', 'ranking'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[feedStyles.segmentItem, tab === t && feedStyles.segmentActive]}>
            <Text style={{ color: tab === t ? Colors.background : Colors.text, fontWeight: '800' }}>{t === 'challenges' ? 'Challenges' : 'Ranking'}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'challenges' ? <ChallengeList /> : <Ranking />}
    </StackPage>
  );
}

function ChallengeList() {
  const { state, dispatch } = useStore();
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listChallenges();
      setChallenges(list);
      updateMyChallengeProgress(state, list).catch(() => {});
      for (const c of list) {
        if (c.members.some((m) => m.name === 'You') && myProgress(state, c) >= c.target) {
          dispatch({ type: 'winChallenge', id: c.id, title: c.title, date: todayKey() });
        }
      }
    } catch {
      setError('Could not load challenges. Check your connection and try again.');
    }
  }, [state, dispatch]);

  const loadRef = useRef(load);
  loadRef.current = load;
  useFocusEffect(
    useCallback(() => {
      loadRef.current();
    }, []),
  );

  const act = async (key: string, action: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      await action();
      haptics.success();
      if (done) Alert.alert(done);
      await load();
    } catch (e) {
      Alert.alert('That did not work', e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const mine = (challenges ?? []).filter((c) => c.members.some((m) => m.name === 'You'));
  const open = (challenges ?? []).filter((c) => !c.members.some((m) => m.name === 'You') && c.end_date >= todayKey());

  return (
    <>
      {creating ? (
        <Card style={{ gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[Type.heading, { color: Colors.text, flex: 1 }]}>New 30-day challenge</Text>
            <Pressable hitSlop={10} onPress={() => setCreating(false)} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>
          <Text style={ui.muted}>Who can join?</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Chip label="My friends" active={visibility === 'friends'} onPress={() => setVisibility('friends')} />
            <Chip label="Everyone" active={visibility === 'public'} onPress={() => setVisibility('public')} />
          </View>
          <Text style={ui.muted}>Pick a goal. Winning earns a badge and 250 XP.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {CHALLENGE_PRESETS.map((p) => (
              <Pressable
                key={p.title}
                disabled={busy !== null}
                style={s.preset}
                onPress={() =>
                  act('create', async () => {
                    await createChallenge(p, visibility);
                    setCreating(false);
                  }, 'Challenge started. Friends can join it now.')
                }>
                <Text style={{ color: Colors.text, fontWeight: '800' }}>{p.title}</Text>
              </Pressable>
            ))}
          </View>
          {busy === 'create' && <ActivityIndicator color={Colors.lime} />}
        </Card>
      ) : (
        <Button title="Start a challenge" icon="flag" onPress={() => setCreating(true)} />
      )}

      {error && (
        <Card style={{ gap: Spacing.sm }}>
          <Text style={{ color: Colors.danger }}>{error}</Text>
          <Button title="Try again" icon="refresh" variant="ghost" onPress={load} />
        </Card>
      )}
      {challenges === null && !error && <ActivityIndicator color={Colors.lime} style={{ marginTop: Spacing.xl }} />}

      {challenges !== null && (
        <>
          <Section title="Your challenges" />
          {mine.length === 0 && (
            <Card>
              <Text style={ui.muted}>You are not in a challenge yet. Start one above or join one below.</Text>
            </Card>
          )}
          {mine.map((c, i) => (
            <FadeInCard key={c.id} index={i}>
              <ChallengeCard
                challenge={c}
                busy={busy === c.id}
                onLeave={() =>
                  Alert.alert(c.creator === myIdFrom(c) && c.members.length === 1 ? 'Delete this challenge?' : 'Leave this challenge?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: c.members.length === 1 ? 'Delete' : 'Leave',
                      style: 'destructive',
                      onPress: () => act(c.id, () => (c.members.length === 1 ? deleteChallenge(c.id) : leaveChallenge(c.id))),
                    },
                  ])
                }
              />
            </FadeInCard>
          ))}

          {open.length > 0 && <Section title="Join one" />}
          {open.map((c, i) => (
            <FadeInCard key={c.id} index={i}>
              <ChallengeCard challenge={c} busy={busy === c.id} onJoin={() => act(c.id, () => joinChallenge(c.id), `You joined ${c.title}.`)} />
            </FadeInCard>
          ))}
        </>
      )}
    </>
  );
}

/** The creator's own id isn't sent to the app; "You" in the members list is enough to tell. */
function myIdFrom(c: Challenge) {
  return c.members.find((m) => m.name === 'You')?.user_id;
}

function ChallengeCard({ challenge: c, busy, onJoin, onLeave }: { challenge: Challenge; busy: boolean; onJoin?: () => void; onLeave?: () => void }) {
  const { state } = useStore();
  const joined = c.members.some((m) => m.name === 'You');
  const mine = myProgress(state, c);
  const unit = CHALLENGE_PRESETS.find((p) => p.metric === c.metric)?.unit ?? '';
  const won = state.challengeWins.some((w) => w.id === c.id);
  const members = c.members.map((m) => (m.name === 'You' ? { ...m, progress: mine } : m)).sort((a, b) => b.progress - a.progress);

  return (
    <Card highlight={won} style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[Type.heading, { color: Colors.text }]}>{c.title}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pill icon="time-outline" text={endLabel(c.end_date)} />
            <Pill icon={c.visibility === 'public' ? 'globe-outline' : 'people-outline'} text={c.visibility === 'public' ? 'Everyone' : 'Friends'} />
            {won && <Pill icon="trophy" text="Completed" active />}
          </View>
        </View>
        {onLeave && (
          <Pressable hitSlop={10} onPress={onLeave} accessibilityLabel="Leave challenge">
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>
      {joined && (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={ui.muted}>Your progress</Text>
            <Text style={{ color: Colors.lime, fontWeight: '800' }}>
              {mine} of {c.target} {unit}
            </Text>
          </View>
          <ProgressBar progress={mine / c.target} />
        </View>
      )}
      <View style={{ gap: 8 }}>
        {members.slice(0, 5).map((m, i) => (
          <View key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Text style={s.rank}>{i + 1}</Text>
            <Avatar name={m.name} url={m.avatar} size={30} highlight={m.name === 'You'} />
            <Text style={[ui.text, { flex: 1 }]}>{m.name}</Text>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>
              {m.progress} {unit}
            </Text>
          </View>
        ))}
        {members.length > 5 && <Text style={ui.muted}>And {members.length - 5} more</Text>}
      </View>
      {onJoin && <Button title={busy ? 'Joining' : 'Join challenge'} icon="flag" variant="ghost" disabled={busy} onPress={onJoin} />}
    </Card>
  );
}

function Ranking() {
  const { state } = useStore();
  const [me, setMe] = useState<PublicProfile | null>(null);
  const [friends, setFriends] = useState<Friendship[] | null>(null);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setError(false);
      Promise.all([getMyProfile(), listFriendships()])
        .then(([p, fs]) => {
          setMe(p);
          setFriends(fs.filter((f) => f.status === 'accepted'));
        })
        .catch(() => setError(true));
    }, []),
  );

  if (error) {
    return (
      <Card>
        <Text style={{ color: Colors.danger }}>Could not load the ranking. Check your connection.</Text>
      </Card>
    );
  }
  if (!friends) return <ActivityIndicator color={Colors.lime} style={{ marginTop: Spacing.xl }} />;

  const rows = [
    ...friends.map((f) => ({ id: f.friend.id, name: f.friend.display_name, avatar: f.friend.avatar_url, level: f.friend.level, points: pointsThisWeek(f.friend), streak: f.friend.streak })),
    { id: 'me', name: 'You', avatar: me?.avatar_url ?? state.avatarUrl, level: levelInfo(totalXp(state)).level, points: weekPoints(state), streak: currentStreak(state) },
  ].sort((a, b) => b.points - a.points);

  return (
    <Card style={{ gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[Type.heading, { color: Colors.text }]}>This week</Text>
        <Text style={ui.muted}>Starts again on Monday</Text>
      </View>
      {rows.length === 1 && (
        <View style={{ gap: Spacing.sm }}>
          <Text style={ui.muted}>Add friends to see who earns the most points this week.</Text>
          <Button title="Add friends" icon="person-add" variant="ghost" onPress={() => router.push('/friends')} />
        </View>
      )}
      {rows.map((f, i) => (
        <View key={f.id} style={[s.rankRow, f.id === 'me' && { backgroundColor: Colors.limeSoft }]}>
          <Text style={[s.rank, i === 0 && { color: Colors.lime }]}>{i === 0 ? '👑' : i + 1}</Text>
          <Avatar name={f.name} url={f.avatar} level={f.level} highlight={f.id === 'me'} />
          <View style={{ flex: 1 }}>
            <Text style={[ui.text, { fontWeight: '800' }]}>{f.name}</Text>
            <Text style={ui.muted}>
              {f.streak} {f.streak === 1 ? 'day' : 'days'} streak
            </Text>
          </View>
          <Text style={{ color: Colors.lime, fontWeight: '900', fontSize: 16 }}>{f.points}</Text>
        </View>
      ))}
    </Card>
  );
}

const s = StyleSheet.create({
  preset: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.cardRaised, borderWidth: 1, borderColor: Colors.limeBorder },
  rank: { width: 22, color: Colors.textMuted, fontWeight: '900', textAlign: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 8, borderRadius: 14 },
});
