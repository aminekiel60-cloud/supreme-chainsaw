/** FEED: posts from you and your friends (Following) and public posts from everyone (For You). */
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { DemoFriends } from '@/components/DemoFriends';
import { AppHeader } from '@/components/layout';
import { PostCard } from '@/components/PostCard';
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import {
  blockUser,
  deletePost,
  getFeed,
  listFriendships,
  reportPost,
  setLiked,
  setPostVisibility,
  type FeedScope,
  type Friendship,
  type Post,
} from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';

export default function FeedScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <AppHeader />
      {cloudEnabled ? <CloudFeed /> : <DemoFriends />}
    </SafeAreaView>
  );
}

function CloudFeed() {
  const [scope, setScope] = useState<FeedScope>('following');
  const [posts, setPosts] = useState<Record<FeedScope, Post[] | null>>({ following: null, for_you: null });
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState<Record<FeedScope, boolean>>({ following: false, for_you: false });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (which: FeedScope) => {
    setLoading(true);
    setError(null);
    // Each part loads on its own, so one slow or failing part never blanks the whole feed.
    listFriendships()
      .then(setFriends)
      .catch(() => {});
    try {
      const list = await getFeed(which);
      setPosts((p) => ({ ...p, [which]: list }));
      setDone((d) => ({ ...d, [which]: list.length < 25 }));
    } catch {
      setError('Could not load the feed. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  useFocusEffect(
    useCallback(() => {
      load(scopeRef.current);
    }, [load]),
  );

  const switchTo = (next: FeedScope) => {
    if (next === scope) return;
    haptics.tap();
    setScope(next);
    if (posts[next] === null) load(next);
  };

  const loadMore = async () => {
    const list = posts[scope];
    if (!list?.length || done[scope] || loadingMore) return;
    setLoadingMore(true);
    try {
      const older = await getFeed(scope, list[list.length - 1].created_at);
      setPosts((p) => ({ ...p, [scope]: [...(p[scope] ?? []), ...older] }));
      setDone((d) => ({ ...d, [scope]: older.length < 25 }));
    } catch {
      // keep what we have; pulling down retries
    } finally {
      setLoadingMore(false);
    }
  };

  const update = (id: string, change: (p: Post) => Post | null) =>
    setPosts((all) => {
      const next = { ...all };
      for (const k of ['following', 'for_you'] as FeedScope[]) {
        next[k] = all[k] ? (all[k]!.map((p) => (p.id === id ? change(p) : p)).filter(Boolean) as Post[]) : null;
      }
      return next;
    });

  const failed = (what: string) => () => Alert.alert(`Could not ${what}`, 'Check your connection and try again.');

  const actionsFor = (post: Post) => ({
    onLike: () => {
      update(post.id, (p) => ({ ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) }));
      setLiked(post.id, !post.likedByMe).catch(() => load(scope));
    },
    onDelete: () =>
      Alert.alert('Delete this post?', 'It disappears from the feed for everyone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            update(post.id, () => null);
            deletePost(post.id).catch(failed('delete the post'));
          },
        },
      ]),
    onVisibility: () => {
      const visibility = post.visibility === 'public' ? 'friends' : 'public';
      update(post.id, (p) => ({ ...p, visibility }));
      setPostVisibility(post.id, visibility)
        .then(() => Alert.alert(visibility === 'public' ? 'Everyone can see this post now' : 'Only your friends can see this post now'))
        .catch(failed('change who sees it'));
    },
    onReport: (reason: Parameters<typeof reportPost>[1]) => {
      reportPost(post.id, reason)
        .then(() => Alert.alert('Thanks for reporting', 'We look at reported posts. After a few reports a post is hidden from For You.'))
        .catch(failed('send the report'));
    },
    onBlock: () => {
      blockUser(post.user_id)
        .then(() => {
          setPosts((all) => ({
            following: all.following?.filter((p) => p.user_id !== post.user_id) ?? null,
            for_you: all.for_you?.filter((p) => p.user_id !== post.user_id) ?? null,
          }));
          Alert.alert(`${post.author} is blocked`, 'You can unblock people in Settings.');
        })
        .catch(failed('block this person'));
    },
  });

  const list = posts[scope];
  const accepted = friends.filter((f) => f.status === 'accepted');
  const requests = friends.filter((f) => f.status === 'pending' && f.incoming).length;

  const header = (
    <View style={{ gap: Spacing.lg, paddingBottom: Spacing.lg }}>
      {/* Friends row: invite first, then friends */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 2 }}>
        <Pressable style={s.person} onPress={() => router.push('/friends')}>
          <View style={s.invite}>
            <Ionicons name="person-add" size={24} color={Colors.lime} />
            {requests > 0 && (
              <View style={s.requests}>
                <Text style={s.requestsText}>{requests}</Text>
              </View>
            )}
          </View>
          <Text style={s.personName}>{requests > 0 ? 'Requests' : 'Invite'}</Text>
        </Pressable>
        {accepted.map((f) => (
          <Pressable key={f.id} style={s.person} onPress={() => router.push('/friends')}>
            <Avatar name={f.friend.display_name} url={f.friend.avatar_url} size={60} ringLevel={f.friend.level} />
            <Text style={s.personName} numberOfLines={1}>
              {f.friend.display_name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.tabs}>
        {(['following', 'for_you'] as FeedScope[]).map((k) => (
          <Pressable key={k} onPress={() => switchTo(k)} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: scope === k }}>
            <Text style={[s.tabText, scope === k && { color: Colors.text }]}>{k === 'following' ? 'Following' : 'For You'}</Text>
            <View style={[s.tabLine, scope === k && { backgroundColor: Colors.lime }]} />
          </Pressable>
        ))}
      </View>

      {/* Share something */}
      <Pressable onPress={() => router.push('/new-post')} style={s.composer} accessibilityLabel="New post">
        <Ionicons name="camera" size={22} color={Colors.lime} />
        <Text style={[ui.muted, { flex: 1, fontSize: 15 }]}>Share a photo, a meal or a PR</Text>
        <View style={s.composerBtn}>
          <Ionicons name="add" size={20} color={Colors.background} />
        </View>
      </Pressable>

      {/* Challenges banner */}
      <Pressable onPress={() => router.push('/challenges')}>
        <View style={s.banner}>
          <Ionicons name="flag" size={26} color={Colors.lime} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 16 }}>Challenges</Text>
            <Text style={ui.muted}>Join a 30-day challenge with friends.</Text>
          </View>
          <View style={s.bannerButton}>
            <Text style={{ color: Colors.lime, fontWeight: '800' }}>View</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.lime} />
          </View>
        </View>
      </Pressable>

      {error && <Text style={{ color: Colors.danger }}>{error}</Text>}
    </View>
  );

  const empty =
    list === null ? (
      <ActivityIndicator color={Colors.lime} style={{ marginTop: Spacing.xl }} />
    ) : scope === 'following' ? (
      <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: 28 }}>
        <Ionicons name="people" size={40} color={Colors.lime} />
        <Text style={[ui.text, { textAlign: 'center', fontWeight: '700' }]}>Your feed is waiting for friends</Text>
        <Text style={[ui.muted, { textAlign: 'center' }]}>Your workouts and locked-in days show up here, together with your friends&apos;.</Text>
        <Button title="Invite friends" icon="person-add" onPress={() => router.push('/friends')} />
      </Card>
    ) : (
      <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: 28 }}>
        <Ionicons name="globe-outline" size={40} color={Colors.lime} />
        <Text style={[ui.text, { textAlign: 'center', fontWeight: '700' }]}>No public posts yet</Text>
        <Text style={[ui.muted, { textAlign: 'center' }]}>Posts that people share with everyone appear here. Be the first: post a photo and choose Everyone.</Text>
        <Button title="New post" icon="add" onPress={() => router.push('/new-post')} />
      </Card>
    );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={list ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} actions={actionsFor(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.lime} style={{ margin: Spacing.lg }} /> : undefined}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={loading && list !== null} onRefresh={() => load(scope)} tintColor={Colors.lime} colors={[Colors.lime]} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  person: { alignItems: 'center', gap: 6, width: 66 },
  personName: { color: Colors.text, fontSize: 12, fontWeight: '600' },
  invite: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: Colors.limeBorder, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  requests: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  requestsText: { color: Colors.background, fontSize: 11, fontWeight: '900' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, alignItems: 'center', gap: 8 },
  tabText: { color: Colors.textMuted, fontSize: 17, fontWeight: '800' },
  tabLine: { height: 3, width: 70, borderRadius: 2, backgroundColor: 'transparent' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  bannerButton: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: Colors.lime, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 12, paddingLeft: 16, borderRadius: Radius.pill, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  composerBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
});

