/**
 * Social features on top of Supabase: friends, feed, likes, comments,
 * weekly leaderboard and challenges. Who can see what is enforced by the
 * database (supabase/migrations), not by this file.
 */
import { addDays, startOfWeek, todayKey } from '@/store/dates';
import { dayTotals, isLockedIn, pace } from '@/store/logic';
import type { AppState, DateKey } from '@/store/types';
import { db } from './supabase';

export type PublicProfile = {
  id: string;
  display_name: string;
  invite_code: string;
  week_start: string | null;
  week_points: number;
  streak: number;
};

export type Friendship = {
  id: number;
  status: 'pending' | 'accepted';
  /** True when the other person sent the request to you */
  incoming: boolean;
  friend: PublicProfile;
};

export type Post = {
  id: string;
  user_id: string;
  kind: 'workout' | 'locked_in' | 'achievement';
  title: string;
  stats: { label: string; value: string }[];
  created_at: string;
  author: string;
  likes: number;
  likedByMe: boolean;
  comments: number;
};

export type Comment = { id: number; body: string; created_at: string; author: string; user_id: string };

export type ChallengeMetric = 'run_km' | 'workouts' | 'locked_in_days' | 'protein_days';

export type Challenge = {
  id: string;
  creator: string;
  title: string;
  metric: ChallengeMetric;
  target: number;
  start_date: string;
  end_date: string;
  members: { user_id: string; name: string; progress: number }[];
};

async function myId(): Promise<string> {
  const { data } = await db().auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
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

/** Send a friend request using someone's invite code. Returns their name. */
export async function addFriendByCode(code: string): Promise<string> {
  const me = await myId();
  const clean = code.trim().toUpperCase();
  const { data: friend } = await db().from('profiles').select('id, display_name').eq('invite_code', clean).maybeSingle();
  if (!friend) throw new Error('No one found with that code. Check it and try again.');
  if (friend.id === me) throw new Error("That's your own code 🙂");
  const { error } = await db().from('friendships').insert({ requester: me, addressee: friend.id });
  if (error) {
    if (error.code === '23505') throw new Error(`You and ${friend.display_name} are already connected.`);
    throw error;
  }
  return friend.display_name;
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

export async function getFeed(): Promise<Post[]> {
  const me = await myId();
  const { data, error } = await db()
    .from('posts')
    .select('id, user_id, kind, title, stats, created_at, profiles(display_name), post_likes(user_id), post_comments(count)')
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    kind: p.kind,
    title: p.title,
    stats: p.stats ?? [],
    created_at: p.created_at,
    author: p.user_id === me ? 'You' : p.profiles?.display_name ?? 'Friend',
    likes: p.post_likes.length,
    likedByMe: p.post_likes.some((l: { user_id: string }) => l.user_id === me),
    comments: p.post_comments[0]?.count ?? 0,
  }));
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export async function shareRecentActivity(state: AppState) {
  const me = await myId();
  const since = addDays(todayKey(), -6);
  const posts: { user_id: string; ref: string; kind: string; title: string; stats: unknown }[] = [];

  for (const w of state.workouts.filter((x) => x.date >= since)) {
    const stats = [{ label: 'Time', value: `${w.durationMin} min` }];
    if (w.distanceKm) stats.unshift({ label: 'Distance', value: `${w.distanceKm} km` });
    if (w.distanceKm) stats.push({ label: 'Pace', value: pace(w) ?? '' });
    if (w.exercises?.length) {
      const sets = w.exercises.reduce((t, e) => t + e.sets.length, 0);
      stats.unshift({ label: 'Exercises', value: String(w.exercises.length) }, { label: 'Sets', value: String(sets) });
    }
    posts.push({ user_id: me, ref: `workout:${w.id}`, kind: 'workout', title: w.title, stats });
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
  { metric: 'run_km', title: 'Run 50 km', target: 50, unit: 'km' },
  { metric: 'workouts', title: '12 workouts', target: 12, unit: 'workouts' },
  { metric: 'locked_in_days', title: 'Locked in 20 days', target: 20, unit: 'days' },
  { metric: 'protein_days', title: 'Protein goal 14 days', target: 14, unit: 'days' },
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

export async function listChallenges(): Promise<Challenge[]> {
  const { data, error } = await db()
    .from('challenges')
    .select('*, challenge_members(user_id, progress, profiles(display_name))')
    .gte('end_date', addDays(todayKey(), -7))
    .order('end_date');
  if (error) throw error;
  const me = await myId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((c) => ({
    ...c,
    members: c.challenge_members
      .map((m: { user_id: string; progress: number; profiles: { display_name: string } | null }) => ({
        user_id: m.user_id,
        name: m.user_id === me ? 'You' : m.profiles?.display_name ?? 'Friend',
        progress: Number(m.progress),
      }))
      .sort((a: { progress: number }, b: { progress: number }) => b.progress - a.progress),
  }));
}

/** Start a 30-day challenge and join it yourself; friends can join from their app. */
export async function createChallenge(preset: (typeof CHALLENGE_PRESETS)[number]) {
  const me = await myId();
  const start = todayKey();
  const { data, error } = await db()
    .from('challenges')
    .insert({ creator: me, title: preset.title, metric: preset.metric, target: preset.target, start_date: start, end_date: addDays(start, 29) })
    .select('id')
    .single();
  if (error) throw error;
  await joinChallenge(data.id);
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
