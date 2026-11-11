/** One activity in the feed: who, what, photo, stats, friends tagged, likes and comments. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { Post } from '@/lib/social';
import { sport } from '@/store/logic';
import { Avatar } from './Avatar';
import { Pop } from './motion';
import { Badge, Card, styles as ui } from './ui';

export function timeAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${Math.max(1, min)}m ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)}h ago`;
  return `${Math.round(min / 1440)}d ago`;
}

export function PostCard({ post, onLike }: { post: Post; onLike: () => void }) {
  const info = post.workoutType ? sport(post.workoutType) : null;

  return (
    <Card style={{ gap: Spacing.md, padding: 0, overflow: 'hidden' }}>
      <View style={[s.head, { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }]}>
        <Avatar name={post.author} url={post.authorAvatar} level={post.authorLevel} highlight={post.author === 'You'} />
        <View style={{ flex: 1 }}>
          <Text style={[ui.text, { fontWeight: '800' }]}>{post.author}</Text>
          <Text style={ui.muted}>
            {timeAgo(post.created_at)}
            {info ? ` · ${info.label}` : ''}
          </Text>
        </View>
        {post.kind === 'locked_in' ? <Badge text="LOCKED IN" /> : info ? <Ionicons name={info.icon} size={20} color={Colors.lime} /> : null}
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, gap: 4 }}>
        <Text style={[Type.heading, { color: Colors.text }]}>{post.title}</Text>
        {post.tagged.length > 0 && (
          <Text style={{ color: Colors.lime, fontWeight: '600' }}>with {post.tagged.map((t) => t.name).join(', ')}</Text>
        )}
      </View>

      {post.stats.length > 0 && (
        <View style={[s.stats, { paddingHorizontal: Spacing.lg }]}>
          {post.stats.map((st) => (
            <View key={st.label}>
              <Text style={ui.statLabel}>{st.label}</Text>
              <Text style={{ color: Colors.text, fontWeight: '900', fontSize: 18 }}>{st.value}</Text>
            </View>
          ))}
        </View>
      )}

      {post.photoUrl && <Image source={{ uri: post.photoUrl }} style={s.photo} contentFit="cover" transition={250} />}

      <View style={[s.actions, { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }]}>
        <Pressable
          style={s.action}
          hitSlop={8}
          onPress={() => {
            haptics.tap();
            onLike();
          }}>
          <Pop trigger={post.likedByMe}>
            <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={24} color={post.likedByMe ? Colors.lime : Colors.textMuted} />
          </Pop>
          <Text style={ui.muted}>{post.likes}</Text>
        </Pressable>
        <Pressable
          style={s.action}
          hitSlop={8}
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id, title: post.title } })}>
          <Ionicons name="chatbubble-outline" size={22} color={Colors.textMuted} />
          <Text style={ui.muted}>{post.comments}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xl },
  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: Colors.cardRaised },
  actions: { flexDirection: 'row', gap: Spacing.xl },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

export const feedStyles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.pill, padding: 4, borderWidth: 1, borderColor: Colors.border },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: Radius.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.lime },
});
