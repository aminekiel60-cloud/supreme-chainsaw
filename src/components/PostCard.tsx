/**
 * One post in the feed, after the Locked in template: who and when, the photo
 * with the workout or meal on top of it, flex / comment / share, the caption
 * and the newest comment.
 */
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { Post, ReportReason } from '@/lib/social';
import { sport } from '@/store/logic';
import { Avatar } from './Avatar';
import { Pop } from './motion';
import { styles as ui, type IconName } from './ui';

export function timeAgo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)}h ago`;
  const days = Math.round(min / 1440);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

export type PostActions = {
  onLike: () => void;
  onDelete?: () => void;
  onVisibility?: () => void;
  onReport?: (reason: ReportReason) => void;
  onBlock?: () => void;
};

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam' },
  { id: 'nudity', label: 'Nudity' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'harassment', label: 'Bullying or harassment' },
  { id: 'violence', label: 'Violence' },
  { id: 'other', label: 'Something else' },
];

function kindIcon(post: Post): IconName {
  if (post.kind === 'meal') return 'restaurant';
  if (post.kind === 'locked_in') return 'lock-closed';
  if (post.kind === 'photo') return 'camera';
  return post.workoutType ? sport(post.workoutType).icon : 'barbell';
}

export function PostCard({ post, actions }: { post: Post; actions: PostActions }) {
  const mine = post.author === 'You';
  const meal = post.kind === 'meal';

  const menu = () => {
    if (mine) {
      Alert.alert('Your post', undefined, [
        {
          text: post.visibility === 'public' ? 'Show to friends only' : 'Show to everyone (For You)',
          onPress: actions.onVisibility,
        },
        { text: 'Delete post', style: 'destructive', onPress: actions.onDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(post.author, undefined, [
      {
        text: 'Report post',
        onPress: () =>
          Alert.alert('Why are you reporting this?', 'The author is not told who reported it.', [
            ...REASONS.map((r) => ({ text: r.label, onPress: () => actions.onReport?.(r.id) })),
            { text: 'Cancel', style: 'cancel' as const },
          ]),
      },
      {
        text: `Block ${post.author}`,
        style: 'destructive',
        onPress: () =>
          Alert.alert(`Block ${post.author}?`, 'You will not see each other’s posts and comments anymore. If you are friends, the friendship ends.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Block', style: 'destructive', onPress: actions.onBlock },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const share = () => {
    const what = post.kind === 'workout' ? `${post.author === 'You' ? 'I' : post.author} just finished ${post.title}` : post.title;
    Share.share({ message: `${what} on Locked in. Lock in. Level up.` }).catch(() => {});
  };

  const openComments = () => router.push({ pathname: '/post/[id]', params: { id: post.id, title: post.title } });

  return (
    <View style={s.post}>
      {/* Who and when */}
      <View style={s.head}>
        <Avatar name={post.author} url={post.authorAvatar} size={44} highlight={post.authorTraining || mine} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{post.author}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={ui.muted}>{timeAgo(post.created_at)}</Text>
            {post.visibility === 'public' && <Ionicons name="globe-outline" size={13} color={Colors.textMuted} accessibilityLabel="Public" />}
            {post.authorTraining && !mine && <Text style={s.training}>Training now</Text>}
          </View>
        </View>
        <Pressable hitSlop={12} onPress={menu} accessibilityLabel="Post options">
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
        </Pressable>
      </View>

      {/* Photo with the activity on top, or just the activity */}
      {post.photoUrl ? (
        <Pressable onPress={openComments} style={s.media}>
          <Image source={{ uri: post.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          {meal ? <MealOverlay post={post} /> : <ActivityOverlay post={post} />}
        </Pressable>
      ) : (
        <View style={s.noPhoto}>
          <View style={s.overlayIcon}>
            <Ionicons name={kindIcon(post)} size={20} color={Colors.lime} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[Type.heading, { color: Colors.text }]}>{post.title}</Text>
            <StatPills post={post} />
          </View>
          {post.kind === 'locked_in' && <Ionicons name="checkmark-circle" size={26} color={Colors.lime} />}
        </View>
      )}

      {/* Flex, comment, share */}
      <View style={s.actions}>
        <Pressable
          style={s.action}
          hitSlop={8}
          onPress={() => {
            haptics.tap();
            actions.onLike();
          }}
          accessibilityLabel={post.likedByMe ? 'Remove your flex' : 'Give a flex'}>
          <Pop trigger={post.likedByMe}>
            <MaterialCommunityIcons name={post.likedByMe ? 'arm-flex' : 'arm-flex-outline'} size={26} color={post.likedByMe ? Colors.lime : Colors.text} />
          </Pop>
          <Text style={s.count}>{post.likes}</Text>
        </Pressable>
        <Pressable style={s.action} hitSlop={8} onPress={openComments} accessibilityLabel="Comments">
          <Ionicons name="chatbubble-outline" size={23} color={Colors.text} />
          <Text style={s.count}>{post.comments}</Text>
        </Pressable>
        <Pressable style={s.action} hitSlop={8} onPress={share} accessibilityLabel="Share">
          <Ionicons name="paper-plane-outline" size={23} color={Colors.text} />
        </Pressable>
      </View>

      {/* Caption, tags and the newest comment */}
      <View style={{ gap: 4, paddingHorizontal: 2 }}>
        {(post.caption || post.photoUrl) && (
          <Text style={ui.text}>
            <Text style={{ fontWeight: '800' }}>{post.author} </Text>
            {post.caption ?? post.title}
          </Text>
        )}
        {post.tagged.length > 0 && <Text style={{ color: Colors.lime, fontWeight: '600' }}>With {post.tagged.map((t) => t.name).join(', ')}</Text>}
        {post.comments > 1 && (
          <Pressable onPress={openComments} hitSlop={6}>
            <Text style={ui.muted}>View all {post.comments} comments</Text>
          </Pressable>
        )}
        {post.latestComment && (
          <Pressable onPress={openComments}>
            <Text style={ui.text} numberOfLines={2}>
              <Text style={{ fontWeight: '800' }}>{post.latestComment.name} </Text>
              {post.latestComment.body}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function StatPills({ post }: { post: Post }) {
  if (post.stats.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {post.stats.map((st) => (
        <View key={st.label} style={s.statPill}>
          <Text style={s.statValue}>{st.value}</Text>
          <Text style={s.statLabel}>{st.label.toLowerCase()}</Text>
        </View>
      ))}
    </View>
  );
}

function ActivityOverlay({ post }: { post: Post }) {
  return (
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.overlayWrap}>
      <View style={s.overlay}>
        <View style={s.overlayIcon}>
          <Ionicons name={kindIcon(post)} size={20} color={Colors.lime} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.overlayTitle} numberOfLines={1}>
            {post.title}
          </Text>
          {post.stats.length > 0 && (
            <Text style={s.overlayStats} numberOfLines={1}>
              {post.stats
                .slice(0, 3)
                .map((x) => `${x.value} ${x.label.toLowerCase()}`)
                .join('   ')}
            </Text>
          )}
        </View>
        {(post.kind === 'workout' || post.kind === 'locked_in') && (
          <View style={s.check}>
            <Ionicons name="checkmark" size={18} color={Colors.background} />
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

function MealOverlay({ post }: { post: Post }) {
  if (post.stats.length === 0) return null;
  return (
    <View style={s.mealCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Ionicons name="restaurant" size={18} color={Colors.lime} />
        <Text style={s.overlayTitle}>Meal</Text>
      </View>
      {post.stats.map((st) => (
        <View key={st.label} style={s.mealRow}>
          <Text style={s.mealValue}>{st.value}</Text>
          <Text style={s.overlayStats}>{st.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  post: { gap: Spacing.md, paddingBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  name: { color: Colors.text, fontWeight: '800', fontSize: 16 },
  training: { color: Colors.lime, fontSize: 12, fontWeight: '800' },
  media: { width: '100%', aspectRatio: 4 / 5, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.cardRaised, justifyContent: 'flex-end' },
  noPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overlayWrap: { padding: 12, paddingTop: 60 },
  overlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(17,17,17,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  overlayIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.limeSoft, alignItems: 'center', justifyContent: 'center' },
  overlayTitle: { color: Colors.text, fontWeight: '800', fontSize: 17 },
  overlayStats: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  check: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  mealCard: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 12,
    gap: 6,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(17,17,17,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 150,
  },
  mealRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  mealValue: { color: Colors.text, fontWeight: '800', fontSize: 15 },
  statPill: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: Colors.cardRaised, borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  statLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.xl, paddingHorizontal: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { color: Colors.text, fontWeight: '700', fontSize: 15 },
});

export const feedStyles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.pill, padding: 4, borderWidth: 1, borderColor: Colors.border },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: Radius.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.lime },
});
