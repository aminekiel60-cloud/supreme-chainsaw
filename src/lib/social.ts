/**
 * Social features on top of Supabase: friends, feed, likes, comments,
 * weekly leaderboard and challenges. Who can see what is enforced by the
 * database (supabase/migrations), not by this file.
 */
import { addDays, startOfWeek, todayKey } from '@/store/dates';
import { dayTotals, formatDistance, isLockedIn, pace } from '@/store/logic';
import type { AppState, DateKey, WorkoutType } from '@/store/types';
import { uploadPhoto, workoutPhotoUrls } from './photos';
import { db } from './supabase';

export type PublicProfile = {
  id: string;
  display_name: string;
  week_start: string | null;
  week_points: number;
  streak: number;
  avatar_url: string | null;
  xp: number;
  level: number;
};

export type Friendship = {
  id: number;
  status: 'pending' | 'accepted';
  /** True when the other person sent the request to you */
  incoming: boolean;
  friend: PublicProfile;
};

export type PostKind = 'workout' | 'locked_in' | 'achievement' | 'photo' | 'meal' | 'run' | 'pr';
export type Visibility = 'friends' | 'public';

export type Post = {
  id: string;
  user_id: string;
  kind: PostKind;
  title: string;
  caption: string | null;
  visibility: Visibility;
  /** The author is one of your friends */
  isFriend: boolean;
  /** The author is in a live workout right now */
  authorTraining: boolean;
  latestComment: { name: string; body: string } | null;
  stats: { label: string; value: string }[];
  created_at: string;
  author: string;
  authorAvatar: string | null;
  authorLevel: number;
  workoutType: WorkoutType | null;
  /** Temporary link to the workout photo, if any */
  photoUrl: string | null;
  /** Friends who were tagged */
  tagged: { id: string; name: string }[];
  likes: number;
  likedByMe: boolean;
  comments: number;
};

export type Comment = { id: number; body: string; created_at: string; author: string; user_id: string };

export type ChallengeMetric = 'run_km' | 'workouts' | 'locked_in_days' | 'protein_days';

export type Challenge = {
  id: string;
  creator: string;
  club_id: string | null;
  visibility: Visibility;
  title: string;
  metric: ChallengeMetric;
  target: number;
  start_date: string;
  end_date: string;
  members: { user_id: string; name: string; avatar: string | null; progress: number }[];
};

async function myId(): Promise<string> {
  // The saved session is enough here (no network call); the database checks the token anyway.
  const { data } = await db().auth.getSession();
  if (!data.session) throw new Error('Not signed in');
  return data.session.user.id;
}

/** Points only count for the current week. */
export function pointsThisWeek(p: PublicProfile) {
  return p.week_start === startOfWeek(todayKey()) ? p.week_points : 0;
}

// ───────────── Profile & friends ─────────────

export async function getMyProfile(): Promise<PublicProfile> {
  const id = await myId();
  const { data, error } = await db().from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function listFriendships(): Promise<Friendship[]> {
  const me = await myId();
  const { data, error } = await db().from('friendships').select('id, status, requester, addressee');
  if (error) throw error;
  const otherIds = data.map((f) => (f.requester === me ? f.addressee : f.requester));
  if (otherIds.length === 0) return [];
  const { data: people, error: e2 } = await db().from('profiles').select('*').in('id', otherIds);
  if (e2) throw e2;
  return data
    .map((f) => ({
      id: f.id,
      status: f.status,
      incoming: f.addressee === me,
      friend: people.find((p) => p.id === (f.requester === me ? f.addressee : f.requester))!,
    }))
    .filter((f) => f.friend);
}

/** Your private invite code (only you can read it). */
export async function getMyInviteCode(): Promise<string> {
  const { data, error } = await db().from('invite_codes').select('code').eq('user_id', await myId()).single();
  if (error) throw error;
  return data.code;
}

/** Get a new invite code; the old code and old invite links stop working. */
export async function resetMyInviteCode(): Promise<string> {
  const { data, error } = await db().rpc('reset_invite_code');
  if (error) throw error;
  return data as string;
}

export async function acceptFriend(id: number) {
  const { error } = await db().from('friendships').update({ status: 'accepted' }).eq('id', id);
  if (error) throw error;
}

export async function removeFriend(id: number) {
  const { error } = await db().from('friendships').delete().eq('id', id);
  if (error) throw error;
}

// ───────────── Feed ─────────────

export type FeedScope = 'following' | 'for_you';

/**
 * One page of the feed. 'following' is you and your friends, 'for_you' is
 * public posts from everyone else. Pass the created_at of the last post you
 * have as `before` to load older posts.
 */
export async function getFeed(scope: FeedScope = 'following', before?: string): Promise<Post[]> {
  const { data, error } = await db().rpc('get_feed_v2', { p_scope: scope, p_limit: 25, p_before: before ?? null });
  if (error) throw error;
  return toPosts((data ?? []) as FeedRow[]);
}

type FeedRow = {
  id: string;
  user_id: string;
  kind: PostKind;
  title: string;
  caption: string | null;
  stats: Post['stats'] | null;
  created_at: string;
  workout_type: WorkoutType | null;
  photo_path: string | null;
  visibility: Visibility;
  tagged: string[] | null;
  tagged_names: string[] | null;
  author_name: string | null;
  author_avatar: string | null;
  author_level: number | null;
  author_training: boolean;
  is_friend: boolean;
  likes: number;
  liked_by_me: boolean;
  comments: number;
  latest_comment: { name: string; body: string } | null;
};

async function toPosts(rows: FeedRow[]): Promise<Post[]> {
  const me = await myId();
  const photoUrls = await workoutPhotoUrls(rows.map((p) => p.photo_path).filter((x): x is string => Boolean(x)));
  return rows.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    kind: p.kind,
    title: p.title,
    caption: p.caption,
    visibility: p.visibility,
    isFriend: p.is_friend,
    authorTraining: p.author_training,
    latestComment: p.latest_comment,
    stats: p.stats ?? [],
    created_at: p.created_at,
    author: p.user_id === me ? 'You' : p.author_name ?? 'Athlete',
    authorAvatar: p.author_avatar,
    authorLevel: p.author_level ?? 1,
    workoutType: p.workout_type,
    photoUrl: p.photo_path ? photoUrls[p.photo_path] ?? null : null,
    tagged: (p.tagged ?? []).map((id, i) => ({ id, name: id === me ? 'You' : p.tagged_names?.[i] ?? 'Friend' })),
    likes: p.likes,
    likedByMe: p.liked_by_me,
    comments: p.comments,
  }));
}

/** Post a photo (or a meal) with a caption. Returns the new post's id. */
export async function createPost(input: {
  kind: 'photo' | 'meal';
  title: string;
  caption: string;
  photoUri: string | null;
  visibility: Visibility;
  stats?: Post['stats'];
}): Promise<string> {
  const me = await myId();
  const ref = `post:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  let photo_path: string | null = null;
  if (input.photoUri) photo_path = await uploadPhoto('workout-photos', `${me}/${ref.slice(5)}.jpg`, input.photoUri, 1080);
  const { data, error } = await db()
    .from('posts')
    .insert({
      user_id: me,
      ref,
      kind: input.kind,
      title: input.title.trim() || (input.kind === 'meal' ? 'Meal' : 'Photo'),
      caption: input.caption.trim() || null,
      stats: input.stats ?? [],
      photo_path,
      visibility: input.visibility,
    })
    .select('id')
    .single();
  if (error) {
    if (photo_path) db().storage.from('workout-photos').remove([photo_path]).catch(() => {});
    throw error;
  }
  return data.id;
}

export async function setPostVisibility(postId: string, visibility: Visibility) {
  const { error } = await db().from('posts').update({ visibility }).eq('id', postId);
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { data } = await db().from('posts').select('photo_path').eq('id', postId).maybeSingle();
  const { error } = await db().from('posts').delete().eq('id', postId);
  if (error) throw error;
  if (data?.photo_path) db().storage.from('workout-photos').remove([data.photo_path]).catch(() => {});
}

export type ReportReason = 'spam' | 'nudity' | 'hate' | 'harassment' | 'violence' | 'other';

/** Report a post. After 3 reports it leaves the public feed until it's reviewed. */
export async function reportPost(postId: string, reason: ReportReason) {
  const { error } = await db().rpc('report_post', { p_post: postId, p_reason: reason });
  if (error) throw error;
}

/** Block someone: you stop seeing each other's posts and comments, and a friendship ends. */
export async function blockUser(userId: string) {
  const me = await myId();
  const { error } = await db().from('blocks').insert({ blocker: me, blocked: userId });
  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(userId: string) {
  const me = await myId();
  const { error } = await db().from('blocks').delete().eq('blocker', me).eq('blocked', userId);
  if (error) throw error;
}

export async function listBlocked(): Promise<PublicProfile[]> {
  const { data, error } = await db().from('blocks').select('blocked');
  if (error) throw error;
  const ids = data.map((b) => b.blocked);
  if (ids.length === 0) return [];
  const { data: people } = await db().from('profiles').select('*').in('id', ids);
  return people ?? [];
}

/** Tell friends you're training right now (or stop). */
export async function setTrainingNow(active: boolean) {
  const me = await myId();
  await db().from('profiles').update({ training_since: active ? new Date().toISOString() : null }).eq('id', me);
}

export async function setLiked(postId: string, liked: boolean) {
  const me = await myId();
  const q = liked
    ? db().from('post_likes').insert({ post_id: postId, user_id: me })
    : db().from('post_likes').delete().eq('post_id', postId).eq('user_id', me);
  const { error } = await q;
  if (error && error.code !== '23505') throw error;
}

export async function getComments(postId: string): Promise<Comment[]> {
  const me = await myId();
  const { data, error } = await db()
    .from('post_comments')
    .select('id, body, created_at, user_id, profiles(display_name)')
    .eq('post_id', postId)
    .order('created_at');
  if (error) throw error;
  return (data as any[]).map((c) => ({
    id: c.id,
    body: c.body,
    created_at: c.created_at,
    user_id: c.user_id,
    author: c.user_id === me ? 'You' : c.profiles?.display_name ?? 'Friend',
  }));
}

export async function addComment(postId: string, body: string) {
  const me = await myId();
  const { error } = await db().from('post_comments').insert({ post_id: postId, user_id: me, body: body.trim() });
  if (error) throw error;
}

/**
 * Share your last 7 days to the feed: every workout, and every locked-in day.
 * Already-shared items are skipped; deleted workouts are removed from the feed.
 */
/** Short stable fingerprint of a string (for file names). */
function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export async function shareRecentActivity(state: AppState) {
  const me = await myId();
  const since = addDays(todayKey(), -6);
  const posts: {
    user_id: string;
    ref: string;
    kind: string;
    title: string;
    stats: unknown;
    workout_type?: string;
    tagged?: string[];
    visibility?: Visibility;
    caption?: string | null;
  }[] = [];

  // Only workouts you chose to share (older ones, saved before you could choose, count as friends).
  const recent = state.workouts.filter((x) => x.date >= since && (x.shared ?? 'friends') !== 'none');
  for (const w of recent) {
    const stats = [{ label: 'Time', value: `${w.durationMin} min` }];
    if (w.distanceKm) stats.unshift({ label: 'Distance', value: formatDistance(w) });
    if (w.distanceKm) stats.push({ label: w.type === 'cycle' ? 'Speed' : 'Pace', value: pace(w) ?? '' });
    if (w.exercises?.length) {
      const sets = w.exercises.reduce((t, e) => t + e.sets.length, 0);
      stats.unshift({ label: 'Exercises', value: String(w.exercises.length) }, { label: 'Sets', value: String(sets) });
    }
    if (w.prs?.length) stats.push({ label: 'PRs', value: `🏆 ${w.prs.length}` });
    posts.push({
      user_id: me,
      ref: `workout:${w.id}`,
      kind: 'workout',
      title: w.title,
      stats,
      workout_type: w.type,
      tagged: (w.tagged ?? []).map((t) => t.id),
      visibility: w.shared === 'public' ? 'public' : 'friends',
      caption: w.caption?.trim() || null,
    });
  }

  for (let d: DateKey = since; d <= todayKey(); d = addDays(d, 1)) {
    if (!isLockedIn(state, d)) continue;
    const t = dayTotals(state, d);
    posts.push({
      user_id: me,
      ref: `locked:${d}`,
      kind: 'locked_in',
      title: 'Locked in for the day 🔒',
      stats: [
        { label: 'Calories', value: `${Math.round(t.kcal)} kcal` },
        { label: 'Protein', value: `${Math.round(t.protein)} g` },
      ],
    });
  }

  if (posts.length) {
    const { error } = await db().from('posts').upsert(posts, { onConflict: 'user_id,ref', ignoreDuplicates: true });
    if (error) throw error;
  }

  // Keep tags and photos in sync for workouts you edited after logging them.
  const { data: shared } = recent.length === 0 ? { data: [] } : await db()
    .from('posts')
    .select('id, ref, tagged, photo_path, visibility, caption')
    .eq('user_id', me)
    .in('ref', recent.map((w) => `workout:${w.id}`));
  for (const post of shared ?? []) {
    const w = recent.find((x) => `workout:${x.id}` === post.ref);
    if (!w) continue;
    const tagged = (w.tagged ?? []).map((t) => t.id);
    const changes: { tagged?: string[]; photo_path?: string | null; visibility?: Visibility; caption?: string | null } = {};
    if (JSON.stringify(tagged) !== JSON.stringify(post.tagged ?? [])) changes.tagged = tagged;
    const visibility: Visibility = w.shared === 'public' ? 'public' : 'friends';
    if (visibility !== post.visibility) changes.visibility = visibility;
    const caption = w.caption?.trim() || null;
    if (caption !== (post.caption ?? null)) changes.caption = caption;
    // The file name follows the local photo, so a changed photo is uploaded again.
    const wanted = w.photoUri ? `${me}/${w.id}-${hash(w.photoUri)}.jpg` : null;
    if (wanted !== (post.photo_path ?? null)) {
      if (wanted) {
        const uploaded = await uploadPhoto('workout-photos', wanted, w.photoUri!, 1080).catch(() => null);
        if (uploaded) changes.photo_path = uploaded;
      } else {
        changes.photo_path = null;
      }
      if (post.photo_path && changes.photo_path !== undefined) {
        db().storage.from('workout-photos').remove([post.photo_path]).catch(() => {});
      }
    }
    if (Object.keys(changes).length) await db().from('posts').update(changes).eq('id', post.id);
  }

  // Remove feed posts for workouts you deleted.
  const keep = new Set(posts.map((p) => p.ref));
  const { data: mine } = await db()
    .from('posts')
    .select('id, ref')
    .eq('user_id', me)
    .eq('kind', 'workout')
    .gte('created_at', new Date(Date.now() - 8 * 86400e3).toISOString());
  const stale = (mine ?? []).filter((p) => !keep.has(p.ref)).map((p) => p.id);
  if (stale.length) await db().from('posts').delete().in('id', stale);
}

// ───────────── Challenges ─────────────

export const CHALLENGE_PRESETS: { metric: ChallengeMetric; title: string; target: number; unit: string }[] = [
  { metric: 'workouts', title: '12 workouts', target: 12, unit: 'workouts' },
  { metric: 'workouts', title: '20 workouts', target: 20, unit: 'workouts' },
  { metric: 'run_km', title: 'Run 50 km', target: 50, unit: 'km' },
  { metric: 'run_km', title: 'Run 100 km', target: 100, unit: 'km' },
  { metric: 'locked_in_days', title: 'Locked in 20 days', target: 20, unit: 'days' },
  { metric: 'locked_in_days', title: 'Locked in every day', target: 30, unit: 'days' },
  { metric: 'protein_days', title: 'Protein goal 14 days', target: 14, unit: 'days' },
  { metric: 'protein_days', title: 'Protein goal 25 days', target: 25, unit: 'days' },
];

/** Your progress on a challenge, calculated from your own log. */
export function myProgress(state: AppState, c: Pick<Challenge, 'metric' | 'start_date' | 'end_date'>): number {
  const end = c.end_date < todayKey() ? c.end_date : todayKey();
  const inRange = (d: string) => d >= c.start_date && d <= end;
  switch (c.metric) {
    case 'run_km':
      return Math.round(state.workouts.filter((w) => inRange(w.date)).reduce((t, w) => t + (w.distanceKm ?? 0), 0) * 10) / 10;
    case 'workouts':
      return state.workouts.filter((w) => inRange(w.date)).length;
    case 'locked_in_days':
    case 'protein_days': {
      let n = 0;
      for (let d = c.start_date; d <= end; d = addDays(d, 1)) {
        if (c.metric === 'locked_in_days' ? isLockedIn(state, d) : dayTotals(state, d).protein >= state.goals.protein) n++;
      }
      return n;
    }
  }
}

/** Challenges you can see. Pass a club id for that club's challenges only; without it, club challenges are left out. */
export async function listChallenges(clubId?: string): Promise<Challenge[]> {
  const query = db()
    .from('challenges')
    .select('*, challenge_members(user_id, progress, profiles(display_name, avatar_url))')
    .gte('end_date', addDays(todayKey(), -7))
    .order('end_date');
  const { data, error } = await (clubId ? query.eq('club_id', clubId) : query.is('club_id', null));
  if (error) throw error;
  const me = await myId();
  return (data as any[]).map((c) => ({
    ...c,
    members: c.challenge_members
      .map((m: { user_id: string; progress: number; profiles: { display_name: string; avatar_url: string | null } | null }) => ({
        user_id: m.user_id,
        name: m.user_id === me ? 'You' : m.profiles?.display_name ?? 'Athlete',
        avatar: m.profiles?.avatar_url ?? null,
        progress: Number(m.progress),
      }))
      .sort((a: { progress: number }, b: { progress: number }) => b.progress - a.progress),
  }));
}

/** Start a 30-day challenge and join it yourself. Friends (or everyone, when public) can join. */
export async function createChallenge(preset: (typeof CHALLENGE_PRESETS)[number], visibility: Visibility = 'friends', clubId?: string) {
  const me = await myId();
  const start = todayKey();
  const { data, error } = await db()
    .from('challenges')
    .insert({ creator: me, title: preset.title, metric: preset.metric, target: preset.target, start_date: start, end_date: addDays(start, 29), visibility, club_id: clubId ?? null })
    .select('id')
    .single();
  if (error) throw error;
  await joinChallenge(data.id);
}

export async function leaveChallenge(id: string) {
  const me = await myId();
  const { error } = await db().from('challenge_members').delete().eq('challenge_id', id).eq('user_id', me);
  if (error) throw error;
}

export async function deleteChallenge(id: string) {
  const { error } = await db().from('challenges').delete().eq('id', id);
  if (error) throw error;
}

export async function joinChallenge(id: string) {
  const me = await myId();
  const { error } = await db().from('challenge_members').insert({ challenge_id: id, user_id: me });
  if (error && error.code !== '23505') throw error;
}

/** Push your current progress for every challenge you're in. */
export async function updateMyChallengeProgress(state: AppState, challenges: Challenge[]) {
  const me = await myId();
  await Promise.all(
    challenges
      .filter((c) => c.members.some((m) => m.user_id === me))
      .map((c) =>
        db().from('challenge_members').update({ progress: myProgress(state, c) }).eq('challenge_id', c.id).eq('user_id', me),
      ),
  );
}

// ───────────── Find people ─────────────

/** Search Locked in users by name (at least 2 letters). */
export async function searchPeople(query: string): Promise<PublicProfile[]> {
  const me = await myId();
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .ilike('display_name', `%${q.replace(/[%_]/g, '')}%`)
    .neq('id', me)
    .order('xp', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

/** Send a friend request to someone you found by name. */
export async function addFriend(id: string) {
  const me = await myId();
  const { error } = await db().from('friendships').insert({ requester: me, addressee: id });
  if (error && error.code === '23505') throw new Error('You are already connected (or a request is pending).');
  if (error) throw error;
}

// ───────────── Profile picture ─────────────

export async function setAvatar(uri: string): Promise<string> {
  const me = await myId();
  const path = `${me}/avatar-${Date.now()}.jpg`;
  await uploadPhoto('avatars', path, uri, 400);
  const url = db().storage.from('avatars').getPublicUrl(path).data.publicUrl;
  const { error } = await db().from('profiles').update({ avatar_url: url }).eq('id', me);
  if (error) throw error;
  return url;
}

// ───────────── Coach ─────────────

export type CoachLinks = {
  /** Friends you share your nutrition with */
  myCoaches: string[];
  /** Friends who share their nutrition with you */
  myClients: PublicProfile[];
};

export async function getCoachLinks(): Promise<CoachLinks> {
  const me = await myId();
  const { data, error } = await db().from('coach_access').select('owner, coach');
  if (error) throw error;
  const clientIds = data.filter((l) => l.coach === me).map((l) => l.owner);
  const { data: clients } = clientIds.length
    ? await db().from('profiles').select('*').in('id', clientIds)
    : { data: [] as PublicProfile[] };
  return { myCoaches: data.filter((l) => l.owner === me).map((l) => l.coach), myClients: clients ?? [] };
}

/** Let a friend see (or stop seeing) your calories, macros and full log. */
export async function setCoach(friendId: string, allowed: boolean) {
  const me = await myId();
  const { error } = allowed
    ? await db().from('coach_access').insert({ owner: me, coach: friendId })
    : await db().from('coach_access').delete().eq('owner', me).eq('coach', friendId);
  if (error && error.code !== '23505') throw error;
}

/** The full log of someone who chose you as their coach. */
export async function getClientData(ownerId: string): Promise<Partial<AppState> | null> {
  const { data, error } = await db().from('user_data').select('data').eq('user_id', ownerId).maybeSingle();
  if (error) throw error;
  return (data?.data as Partial<AppState>) ?? null;
}

// ───────────── Clubs ─────────────

export type ClubVisibility = 'private' | 'public';

export type Club = {
  id: string;
  name: string;
  description: string;
  visibility: ClubVisibility;
  owner: string;
  ownerName: string;
  members: number;
  isMember: boolean;
  isOwner: boolean;
};

export type ClubMember = PublicProfile & { joined_at: string };

export type JoinResult = { ok: true; club: string; name: string; already: boolean } | { ok: false; error: 'not_found' | 'full' | 'too_many' | 'too_many_tries' };

export const JOIN_ERRORS: Record<Exclude<JoinResult, { ok: true }>['error'], string> = {
  not_found: 'No club with that code. Ask for a new link: the owner may have changed the code.',
  full: 'This club is full (300 members).',
  too_many: 'You are in 20 clubs already. Leave one to join this one.',
  too_many_tries: 'Too many wrong codes. Try again in an hour.',
};

type ClubRow = { id: string; name: string; description: string; visibility: ClubVisibility; owner: string; owner_name: string | null; members: number; is_member: boolean };

async function toClubs(rows: ClubRow[]): Promise<Club[]> {
  const me = await myId();
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    visibility: c.visibility,
    owner: c.owner,
    ownerName: c.owner === me ? 'You' : c.owner_name ?? 'Athlete',
    members: c.members,
    isMember: c.is_member,
    isOwner: c.owner === me,
  }));
}

/** Clubs you're in. */
export async function listMyClubs(): Promise<Club[]> {
  const { data, error } = await db().rpc('list_clubs', { p_query: null });
  if (error) throw error;
  return toClubs((data ?? []) as ClubRow[]);
}

/** Public clubs whose name contains the search (at least 2 letters). */
export async function searchClubs(query: string): Promise<Club[]> {
  if (query.trim().length < 2) return [];
  const { data, error } = await db().rpc('list_clubs', { p_query: query.trim() });
  if (error) throw error;
  return toClubs((data ?? []) as ClubRow[]);
}

export async function getClub(id: string): Promise<Club | null> {
  const mine = await listMyClubs();
  const found = mine.find((c) => c.id === id);
  if (found) return found;
  const { data } = await db().from('clubs').select('id, name').eq('id', id).maybeSingle();
  if (!data) return null;
  const hits = await searchClubs(data.name);
  return hits.find((c) => c.id === id) ?? null;
}

export async function createClub(name: string, description: string, visibility: ClubVisibility): Promise<string> {
  const { data, error } = await db().rpc('create_club', { p_name: name, p_description: description, p_visibility: visibility });
  if (error) throw new Error(/too_many_clubs/.test(error.message) ? 'You can own up to 10 clubs.' : 'Could not create the club. Check your connection and try again.');
  return data as string;
}

export async function updateClub(id: string, change: Partial<Pick<Club, 'name' | 'description' | 'visibility'>>) {
  const { error } = await db().from('clubs').update(change).eq('id', id);
  if (error) throw error;
}

export async function deleteClub(id: string) {
  const { error } = await db().from('clubs').delete().eq('id', id);
  if (error) throw error;
}

export async function joinClubByCode(code: string): Promise<JoinResult> {
  const { data, error } = await db().rpc('join_club', { p_code: code });
  if (error) throw error;
  return data as JoinResult;
}

export async function joinPublicClub(id: string): Promise<JoinResult> {
  const { data, error } = await db().rpc('join_public_club', { p_club: id });
  if (error) throw error;
  return data as JoinResult;
}

/** Leave a club. Owners can't leave; they delete the club instead. */
export async function leaveClub(id: string) {
  const me = await myId();
  const { error } = await db().from('club_members').delete().eq('club_id', id).eq('user_id', me);
  if (error) throw error;
}

/** Owner only. */
export async function removeClubMember(id: string, userId: string) {
  const { error } = await db().from('club_members').delete().eq('club_id', id).eq('user_id', userId);
  if (error) throw error;
}

/** Members only. */
export async function getClubCode(id: string): Promise<string> {
  const { data, error } = await db().from('club_codes').select('code').eq('club_id', id).single();
  if (error) throw error;
  return data.code as string;
}

/** Owner only: the old code and links stop working. */
export async function resetClubCode(id: string): Promise<string> {
  const { data, error } = await db().rpc('reset_club_code', { p_club: id });
  if (error) throw error;
  return data as string;
}

/** Members, best of the week first (points this week, then streak). */
export async function listClubMembers(id: string): Promise<ClubMember[]> {
  const { data, error } = await db()
    .from('club_members')
    .select('joined_at, profiles(id, display_name, week_start, week_points, streak, avatar_url, xp, level)')
    .eq('club_id', id);
  if (error) throw error;
  type Row = { joined_at: string; profiles: PublicProfile | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.profiles)
    .map((r) => ({ ...r.profiles!, joined_at: r.joined_at }))
    .sort((a, b) => pointsThisWeek(b) - pointsThisWeek(a) || b.streak - a.streak);
}

/** Posts of club members that were shared with friends or everyone. */
export async function getClubFeed(id: string, before?: string): Promise<Post[]> {
  const { data, error } = await db().rpc('get_club_feed', { p_club: id, p_limit: 25, p_before: before ?? null });
  if (error) throw error;
  return toPosts((data ?? []) as FeedRow[]);
}

/** Your user id (from the saved session). */
export const currentUserId = myId;
