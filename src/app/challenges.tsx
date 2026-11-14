/** CHALLENGES and RANKING: 30-day challenges with friends (or everyone), and this week's points. */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ChallengeList } from '@/components/ChallengeList';
import { StackPage } from '@/components/layout';
import { feedStyles } from '@/components/PostCard';
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { getMyProfile, listFriendships, pointsThisWeek, type Friendship, type PublicProfile } from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';
import { currentStreak, weekPoints } from '@/store/logic';
import { levelInfo, totalXp } from '@/store/progress';
import { useStore } from '@/store/store';

type Tab = 'challenges' | 'ranking';

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
  rank: { width: 22, color: Colors.textMuted, fontWeight: '900', textAlign: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 8, borderRadius: 14 },
});
