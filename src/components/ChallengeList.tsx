/** A list of 30-day challenges: yours and the ones you can join. Also used inside a club. */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Pill, Section } from '@/components/layout';
import { FadeInCard } from '@/components/motion';
import { Button, Card, Chip, ProgressBar, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import {
  CHALLENGE_PRESETS,
  createChallenge,
  deleteChallenge,
  joinChallenge,
  leaveChallenge,
  listChallenges,
  myProgress,
  updateMyChallengeProgress,
  type Challenge,
  type Visibility,
} from '@/lib/social';
import { fromKey, todayKey } from '@/store/dates';
import { useStore } from '@/store/store';

const endLabel = (date: string) => {
  const end = fromKey(date);
  const days = Math.round((end.getTime() - fromKey(todayKey()).getTime()) / 86400000);
  if (days < 0) return 'Finished';
  if (days === 0) return 'Ends today';
  return days === 1 ? '1 day left' : `${days} days left`;
};

export function ChallengeList({ clubId }: { clubId?: string }) {
  const { state, dispatch } = useStore();
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listChallenges(clubId);
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
  }, [state, dispatch, clubId]);

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
          {!clubId && (
            <>
              <Text style={ui.muted}>Who can join?</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Chip label="My friends" active={visibility === 'friends'} onPress={() => setVisibility('friends')} />
                <Chip label="Everyone" active={visibility === 'public'} onPress={() => setVisibility('public')} />
              </View>
            </>
          )}
          <Text style={ui.muted}>Pick a goal. Winning earns a badge and 250 XP.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {CHALLENGE_PRESETS.map((p) => (
              <Pressable
                key={p.title}
                disabled={busy !== null}
                style={s.preset}
                onPress={() =>
                  act('create', async () => {
                    await createChallenge(p, visibility, clubId);
                    setCreating(false);
                  }, clubId ? 'Challenge started. Club members can join it now.' : 'Challenge started. Friends can join it now.')
                }>
                <Text style={{ color: Colors.text, fontWeight: '800' }}>{p.title}</Text>
              </Pressable>
            ))}
          </View>
          {busy === 'create' && <ActivityIndicator color={Colors.lime} />}
        </Card>
      ) : (
        <Button title={clubId ? 'Start a club challenge' : 'Start a challenge'} icon="flag" onPress={() => setCreating(true)} />
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
            {c.club_id ? <Pill icon="shield-outline" text="Club" /> : <Pill icon={c.visibility === 'public' ? 'globe-outline' : 'people-outline'} text={c.visibility === 'public' ? 'Everyone' : 'Friends'} />}
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
            <Avatar name={m.name} url={m.avatar} size={30} highlight />
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

const s = StyleSheet.create({
  preset: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.cardRaised, borderWidth: 1, borderColor: Colors.limeBorder },
  rank: { width: 22, color: Colors.textMuted, fontWeight: '900', textAlign: 'center' },
});
