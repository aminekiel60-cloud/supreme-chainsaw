/** Demo version of the Friends tab, used when accounts are not set up (local mode). */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, ProgressBar, Screen, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { DEMO_CHALLENGES, DEMO_FEED, DEMO_FRIENDS } from '@/data/friends';
import { currentStreak, weekPoints } from '@/store/logic';
import { useStore } from '@/store/store';

export function DemoFriends() {
  const { state, dispatch } = useStore();

  const ranking = [
    ...DEMO_FRIENDS,
    { id: 'me', name: 'You', initials: 'ME', weekPoints: weekPoints(state), streak: currentStreak(state) },
  ].sort((a, b) => b.weekPoints - a.weekPoints);

  const invite = () =>
    Share.share({ message: 'Lock in with me on Locked in — LOCK IN. LEVEL UP.' }).catch(() => {});

  return (
    <Screen right={<Badge text="DEMO FRIENDS" />}>
      <Text style={[Type.title, { color: Colors.text }]}>Friends</Text>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle action={<Text style={ui.muted}>Resets Monday</Text>}>Weekly ranking</SectionTitle>
        {ranking.map((f, i) => {
          const me = f.id === 'me';
          return (
            <View key={f.id} style={[s.rankRow, me && s.rankMe]}>
              <Text style={[s.rank, i === 0 && { color: Colors.lime }]}>{i + 1}</Text>
              <View style={[s.avatar, me && { backgroundColor: Colors.lime }]}>
                <Text style={{ color: me ? Colors.background : Colors.text, fontWeight: '800', fontSize: 12 }}>
                  {f.initials}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontWeight: '700' }]}>{f.name}</Text>
                <Text style={ui.muted}>🔥 {f.streak} day streak</Text>
              </View>
              <Text style={{ color: Colors.lime, fontWeight: '800' }}>{f.weekPoints} pts</Text>
            </View>
          );
        })}
      </Card>

      <SectionTitle>Challenges</SectionTitle>
      {DEMO_CHALLENGES.map((c) => (
        <Card key={c.id} style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[ui.text, { fontWeight: '700' }]}>{c.title}</Text>
            <Text style={{ color: Colors.lime, fontWeight: '700' }}>{Math.round(c.progress * 100)}%</Text>
          </View>
          <Text style={ui.muted}>{c.detail}</Text>
          <ProgressBar progress={c.progress} />
        </Card>
      ))}

      <SectionTitle>Feed</SectionTitle>
      {DEMO_FEED.map((post) => {
        const friend = DEMO_FRIENDS.find((f) => f.id === post.friendId)!;
        const liked = state.likes.includes(post.id);
        return (
          <Card key={post.id} style={{ gap: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={s.avatar}>
                <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 12 }}>{friend.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontWeight: '700' }]}>{friend.name}</Text>
                <Text style={ui.muted}>{post.when}</Text>
              </View>
            </View>
            <Text style={[Type.heading, { color: Colors.text }]}>{post.title}</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.xl }}>
              {post.stats.map((st) => (
                <View key={st.label}>
                  <Text style={ui.statLabel}>{st.label}</Text>
                  <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 16 }}>{st.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.xl }}>
              <Pressable
                style={s.action}
                onPress={() => dispatch({ type: 'toggleLike', postId: post.id })}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? Colors.lime : Colors.textMuted} />
                <Text style={ui.muted}>{post.likes + (liked ? 1 : 0)}</Text>
              </Pressable>
              <View style={s.action}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} />
                <Text style={ui.muted}>{post.comments}</Text>
              </View>
            </View>
          </Card>
        );
      })}

      <Button title="Invite friends" icon="person-add" variant="ghost" onPress={invite} />
    </Screen>
  );
}

const s = StyleSheet.create({
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 8, borderRadius: 14 },
  rankMe: { backgroundColor: Colors.limeSoft },
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
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
