/** ONE CLUB: feed of members' workouts, weekly ranking, club challenges, members and settings. */
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ChallengeList } from '@/components/ChallengeList';
import { ClubBadge, membersText } from '@/components/ClubBadge';
import { StackPage } from '@/components/layout';
import { PostCard, feedStyles } from '@/components/PostCard';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { clubMessage } from '@/lib/invites';
import {
  blockUser,
  currentUserId,
  deleteClub,
  deletePost,
  getClub,
  getClubCode,
  getClubFeed,
  JOIN_ERRORS,
  joinPublicClub,
  leaveClub,
  listClubMembers,
  pointsThisWeek,
  removeClubMember,
  reportPost,
  resetClubCode,
  setLiked,
  updateClub,
  type Club,
  type ClubMember,
  type ClubVisibility,
  type Post,
} from '@/lib/social';
import { currentStreak, weekPoints } from '@/store/logic';
import { levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';

type Tab = 'feed' | 'ranking' | 'challenges';
const TABS: { id: Tab; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'challenges', label: 'Challenges' },
];

export default function ClubScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const [club, setClub] = useState<Club | null | undefined>(undefined);
  const [code, setCode] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    getClub(id)
      .then((c) => {
        setClub(c);
        if (c?.isMember) getClubCode(id).then(setCode).catch(() => {});
      })
      .catch(() => setError(true));
  }, [id]);
  useFocusEffect(load);

  const invite = () => {
    if (!club || !code) return;
    haptics.tap();
    Share.share({ message: clubMessage(club.name, code) }).catch(() => {});
  };

  if (error) {
    return (
      <StackPage>
        <Card style={{ gap: Spacing.sm }}>
          <Text style={{ color: Colors.danger }}>Could not load the club. Check your connection.</Text>
          <Button title="Try again" icon="refresh" variant="ghost" onPress={load} />
        </Card>
      </StackPage>
    );
  }
  if (club === undefined) return <ActivityIndicator color={Colors.lime} style={{ marginTop: 60 }} />;
  if (club === null) {
    return (
      <StackPage>
        <Card>
          <Text style={ui.muted}>This club does not exist anymore, or you are no longer a member.</Text>
        </Card>
      </StackPage>
    );
  }

  return (
    <StackPage onRefresh={load}>
      <Stack.Screen options={{ title: club.name }} />
      <Card style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <ClubBadge name={club.name} size={58} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[Type.heading, { color: Colors.text, fontSize: 20 }]}>{club.name}</Text>
            <Text style={ui.muted}>
              {membersText(club.members)}, {club.visibility === 'public' ? 'public' : 'private'}
            </Text>
          </View>
        </View>
        {club.description ? <Text style={ui.text}>{club.description}</Text> : null}
        {club.isMember ? (
          <Button title="Invite people" icon="person-add" onPress={invite} />
        ) : (
          <JoinButton club={club} onJoined={load} />
        )}
      </Card>

      {club.isMember && fresh === '1' && (
        <Card highlight style={{ gap: Spacing.sm }}>
          <Text style={[Type.heading, { color: Colors.text }]}>{club.isOwner ? 'Your club is ready' : `Welcome to ${club.name}`}</Text>
          <Text style={ui.muted}>
            {club.isOwner
              ? 'Send the invite link to your gym mates. Members see each other’s workouts shared with friends, and who earns the most points each week.'
              : 'Members see each other’s workouts shared with friends, and who earns the most points each week.'}
          </Text>
        </Card>
      )}

      {club.isMember && (
        <>
          <View style={feedStyles.segment}>
            {TABS.map((t) => (
              <Pressable key={t.id} onPress={() => setTab(t.id)} style={[feedStyles.segmentItem, tab === t.id && feedStyles.segmentActive]} accessibilityRole="tab">
                <Text style={{ color: tab === t.id ? Colors.background : Colors.text, fontWeight: '800' }}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          {tab === 'feed' && <ClubFeed clubId={club.id} />}
          {tab === 'ranking' && <ClubRanking club={club} code={code} onCode={setCode} onChange={load} />}
          {tab === 'challenges' && <ChallengeList clubId={club.id} />}
        </>
      )}
    </StackPage>
  );
}

function JoinButton({ club, onJoined }: { club: Club; onJoined: () => void }) {
  const [busy, setBusy] = useState(false);
  if (club.visibility !== 'public') return <Text style={ui.muted}>This club is private. Ask a member for the code.</Text>;
  return (
    <Button
      title={busy ? 'Joining' : 'Join the club'}
      icon="enter"
      disabled={busy}
      onPress={async () => {
        setBusy(true);
        try {
          const r = await joinPublicClub(club.id);
          if (r.ok) {
            haptics.success();
            onJoined();
          } else Alert.alert('Could not join', JOIN_ERRORS[r.error]);
        } catch {
          Alert.alert('Could not join', 'Check your connection and try again.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

function ClubFeed({ clubId }: { clubId: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    getClubFeed(clubId)
      .then(setPosts)
      .catch(() => setError(true));
  }, [clubId]);
  useFocusEffect(load);

  const failed = (what: string) => () => Alert.alert(`Could not ${what}`, 'Check your connection and try again.');
  const update = (id: string, change: (p: Post) => Post | null) => setPosts((all) => all && (all.map((p) => (p.id === id ? change(p) : p)).filter(Boolean) as Post[]));

  if (error) return <Text style={{ color: Colors.danger }}>Could not load the club feed. Pull down to try again.</Text>;
  if (!posts) return <ActivityIndicator color={Colors.lime} />;
  if (posts.length === 0) {
    return (
      <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: 24 }}>
        <Ionicons name="barbell" size={36} color={Colors.lime} />
        <Text style={[ui.text, { fontWeight: '700', textAlign: 'center' }]}>Nothing here yet</Text>
        <Text style={[ui.muted, { textAlign: 'center' }]}>When members finish a workout and share it with friends or everyone, it shows up here.</Text>
      </Card>
    );
  }
  return (
    <View style={{ gap: Spacing.lg }}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          actions={{
            onLike: () => {
              update(post.id, (p) => ({ ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) }));
              setLiked(post.id, !post.likedByMe).catch(load);
            },
            onDelete: () => {
              update(post.id, () => null);
              deletePost(post.id).catch(failed('delete the post'));
            },
            onReport: (reason) =>
              reportPost(post.id, reason)
                .then(() => Alert.alert('Thanks for reporting', 'We look at reported posts.'))
                .catch(failed('send the report')),
            onBlock: () =>
              blockUser(post.user_id)
                .then(() => {
                  setPosts((all) => all?.filter((p) => p.user_id !== post.user_id) ?? null);
                  Alert.alert(`${post.author} is blocked`, 'You can unblock people in Settings.');
                })
                .catch(failed('block this person')),
          }}
        />
      ))}
    </View>
  );
}

function ClubRanking({ club, code, onCode, onChange }: { club: Club; code: string | null; onCode: (c: string) => void; onChange: () => void }) {
  const { state } = useStore();
  const [members, setMembers] = useState<ClubMember[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([listClubMembers(club.id), currentUserId()])
      .then(([list, id]) => {
        setMembers(list);
        setMe(id);
      })
      .catch(() => setError(true));
  }, [club.id]);
  useFocusEffect(load);

  if (error) return <Text style={{ color: Colors.danger }}>Could not load the members. Check your connection.</Text>;
  if (!members) return <ActivityIndicator color={Colors.lime} />;

  // Your own points come from the phone, so they're always up to date.
  const rows = members
    .map((m) =>
      m.id === me
        ? { id: m.id, name: 'You', avatar: m.avatar_url ?? state.avatarUrl, level: levelInfo(totalXp(state)).level, points: weekPoints(state), streak: currentStreak(state) }
        : { id: m.id, name: m.display_name, avatar: m.avatar_url, level: m.level, points: pointsThisWeek(m), streak: m.streak },
    )
    .sort((a, b) => b.points - a.points || b.streak - a.streak);

  const remove = (row: (typeof rows)[number]) =>
    Alert.alert(`Remove ${row.name}?`, 'They leave the club. They can only come back with a new code if you reset it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          removeClubMember(club.id, row.id)
            .then(() => {
              load();
              onChange();
            })
            .catch(() => Alert.alert('Could not remove', 'Check your connection and try again.')),
      },
    ]);

  return (
    <>
      <Card style={{ gap: Spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[Type.heading, { color: Colors.text }]}>This week</Text>
          <Text style={ui.muted}>Starts again on Monday</Text>
        </View>
        {rows.map((r, i) => (
          <View key={r.id} style={[s.rankRow, r.name === 'You' && { backgroundColor: Colors.limeSoft }]}>
            <Text style={[s.rank, i === 0 && { color: Colors.lime }]}>{i === 0 ? '👑' : i + 1}</Text>
            <Avatar name={r.name} url={r.avatar} level={r.level} highlight={r.name === 'You'} />
            <View style={{ flex: 1 }}>
              <Text style={[ui.text, { fontWeight: '800' }]}>
                {r.name}
                {r.id === club.owner && r.name !== 'You' ? '  ★' : ''}
              </Text>
              <Text style={ui.muted}>
                {r.streak} {r.streak === 1 ? 'day' : 'days'} streak
              </Text>
            </View>
            <Text style={{ color: Colors.lime, fontWeight: '900', fontSize: 16 }}>{r.points}</Text>
            {club.isOwner && r.id !== me && (
              <Pressable hitSlop={10} onPress={() => remove(r)} accessibilityLabel={`Remove ${r.name}`}>
                <Ionicons name="close-circle-outline" size={22} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>
        ))}
        <Text style={ui.muted}>Points come from locked-in days, workouts and habits, like your own weekly points.</Text>
      </Card>

      {club.isOwner ? <ClubSettings club={club} code={code} onCode={onCode} onChange={onChange} /> : <LeaveClub club={club} code={code} />}
    </>
  );
}

function CodeRow({ code, onReset }: { code: string | null; onReset?: () => void }) {
  if (!code) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.muted}>Club code</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <Text style={s.code}>{code}</Text>
        <Text
          onPress={() => {
            Clipboard.setStringAsync(code).catch(() => {});
            haptics.tap();
          }}
          style={{ color: Colors.lime, fontWeight: '700' }}>
          Copy
        </Text>
        {onReset && (
          <Text onPress={onReset} style={{ color: Colors.textMuted, fontWeight: '700' }}>
            New code
          </Text>
        )}
      </View>
    </View>
  );
}

function LeaveClub({ club, code }: { club: Club; code: string | null }) {
  return (
    <Card style={{ gap: Spacing.md }}>
      <CodeRow code={code} />
      <Button
        title="Leave club"
        icon="exit-outline"
        variant="ghost"
        onPress={() =>
          Alert.alert(`Leave ${club.name}?`, undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: () =>
                leaveClub(club.id)
                  .then(() => router.back())
                  .catch(() => Alert.alert('Could not leave', 'Check your connection and try again.')),
            },
          ])
        }
      />
    </Card>
  );
}

function ClubSettings({ club, code, onCode, onChange }: { club: Club; code: string | null; onCode: (c: string) => void; onChange: () => void }) {
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description);
  const [visibility, setVisibility] = useState<ClubVisibility>(club.visibility);
  const [busy, setBusy] = useState(false);
  const changed = name.trim() !== club.name || description.trim() !== club.description || visibility !== club.visibility;

  const save = async () => {
    setBusy(true);
    try {
      await updateClub(club.id, { name: name.trim(), description: description.trim(), visibility });
      haptics.success();
      onChange();
    } catch {
      Alert.alert('Could not save', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () =>
    Alert.alert('Make a new code?', 'The old code and invite links stop working. Members stay in the club.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New code',
        onPress: () =>
          resetClubCode(club.id)
            .then(onCode)
            .catch(() => Alert.alert('Could not change the code', 'Check your connection and try again.')),
      },
    ]);

  const remove = () =>
    Alert.alert(`Delete ${club.name}?`, 'The club, its ranking and its challenges are gone for everyone. Posts stay on each member’s profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteClub(club.id)
            .then(() => router.back())
            .catch(() => Alert.alert('Could not delete', 'Check your connection and try again.')),
      },
    ]);

  return (
    <Card style={{ gap: Spacing.md }}>
      <SectionTitle>Club settings</SectionTitle>
      <CodeRow code={code} onReset={reset} />
      <TextInput style={ui.input} value={name} onChangeText={setName} maxLength={40} placeholder="Club name" placeholderTextColor={Colors.textFaint} accessibilityLabel="Club name" />
      <TextInput
        style={[ui.input, { minHeight: 70, textAlignVertical: 'top' }]}
        value={description}
        onChangeText={setDescription}
        maxLength={300}
        multiline
        placeholder="What is it about?"
        placeholderTextColor={Colors.textFaint}
        accessibilityLabel="Club description"
      />
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Chip label="With the code" active={visibility === 'private'} onPress={() => setVisibility('private')} />
        <Chip label="Anyone (public)" active={visibility === 'public'} onPress={() => setVisibility('public')} />
      </View>
      {changed && <Button title={busy ? 'Saving' : 'Save changes'} icon="checkmark" disabled={busy || name.trim().length < 2} onPress={save} />}
      <Pressable onPress={remove} style={{ alignSelf: 'center', padding: 6 }} accessibilityLabel="Delete club">
        <Text style={{ color: Colors.danger, fontWeight: '700' }}>Delete club</Text>
      </Pressable>
    </Card>
  );
}

const s = StyleSheet.create({
  rank: { width: 22, color: Colors.textMuted, fontWeight: '900', textAlign: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 8, borderRadius: 14 },
  code: { color: Colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 3, backgroundColor: Colors.cardRaised, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, overflow: 'hidden' },
});
