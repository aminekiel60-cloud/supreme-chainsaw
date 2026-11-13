/** Week in review: everything you did in one week, as numbers you can choose from and share. */
import { addDays, fromKey, startOfWeek, todayKey } from './dates';
import { currentStreak, dayPoints, dayProgress, dayTotals, habitDone, isLockedIn } from './logic';
import type { AppState, DateKey, Workout } from './types';

export type ReviewStatId =
  | 'workouts'
  | 'activeMinutes'
  | 'distance'
  | 'volume'
  | 'lockedDays'
  | 'prs'
  | 'kcal'
  | 'protein'
  | 'steps'
  | 'sleep'
  | 'water'
  | 'xp'
  | 'streak';

export type ReviewStat = {
  id: ReviewStatId;
  label: string;
  value: string;
  /** Raw number, for comparing with the week before */
  raw: number;
  /** Change vs. the previous week, e.g. "+2" or "−40 min" (empty when the same or not comparable) */
  delta: string;
  up: boolean;
};

export type WeekReview = {
  start: DateKey;
  end: DateKey;
  label: string;
  days: { date: DateKey; minutes: number; progress: number; locked: boolean }[];
  workouts: Workout[];
  stats: ReviewStat[];
  headline: string;
};

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, '0')}m` : `${Math.round(min)} min`);
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

function numbers(state: AppState, start: DateKey) {
  const today = todayKey();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => d <= today);
  const workouts = state.workouts.filter((w) => w.date >= start && w.date <= addDays(start, 6));
  const logged = dates.filter((d) => dayTotals(state, d).kcal > 0);
  const slept = dates.map((d) => state.health[d]?.sleepMinutes ?? 0).filter((m) => m > 0);
  return {
    dates,
    workouts,
    workoutCount: workouts.length,
    activeMinutes: workouts.reduce((t, w) => t + w.durationMin, 0),
    distance: workouts.reduce((t, w) => t + (w.distanceKm ?? 0), 0),
    volume: workouts.reduce(
      (t, w) => t + (w.exercises ?? []).reduce((v, e) => v + e.sets.filter((s) => !s.warmup).reduce((x, s) => x + s.reps * s.weight, 0), 0),
      0,
    ),
    lockedDays: dates.filter((d) => isLockedIn(state, d)).length,
    prs: workouts.reduce((t, w) => t + (w.prs?.length ?? 0), 0),
    kcal: logged.length ? logged.reduce((t, d) => t + dayTotals(state, d).kcal, 0) / logged.length : 0,
    proteinDays: dates.filter((d) => habitDone(state, d, 'protein')).length,
    steps: dates.reduce((t, d) => t + (state.health[d]?.steps ?? 0), 0),
    sleep: slept.length ? slept.reduce((t, m) => t + m, 0) / slept.length : 0,
    water: dates.reduce((t, d) => t + (state.water[d] ?? 0), 0) / 1000,
    xp: dates.reduce((t, d) => t + dayPoints(state, d), 0),
  };
}

export function weekReview(state: AppState, weekStart?: DateKey): WeekReview {
  const start = weekStart ?? startOfWeek(todayKey());
  const end = addDays(start, 6);
  const n = numbers(state, start);
  const p = numbers(state, addDays(start, -7));
  const hasPrevious = p.workoutCount > 0 || p.lockedDays > 0;

  const stat = (id: ReviewStatId, label: string, raw: number, prev: number, value: string, deltaText: (d: number) => string): ReviewStat => {
    const d = raw - prev;
    return { id, label, value, raw, delta: hasPrevious && Math.abs(d) >= 0.05 ? `${d > 0 ? '+' : '−'}${deltaText(Math.abs(d))}` : '', up: d >= 0 };
  };

  const stats: ReviewStat[] = [
    stat('workouts', 'Workouts', n.workoutCount, p.workoutCount, String(n.workoutCount), (d) => String(d)),
    stat('activeMinutes', 'Active time', n.activeMinutes, p.activeMinutes, hm(n.activeMinutes), hm),
    stat('distance', 'Distance', n.distance, p.distance, `${n.distance.toFixed(1)} km`, (d) => `${d.toFixed(1)} km`),
    stat('volume', 'Weight lifted', n.volume, p.volume, `${fmt(n.volume)} kg`, (d) => `${fmt(d)} kg`),
    stat('lockedDays', 'Locked-in days', n.lockedDays, p.lockedDays, `${n.lockedDays} / ${n.dates.length}`, (d) => String(d)),
    stat('prs', 'Personal records', n.prs, p.prs, String(n.prs), (d) => String(d)),
    stat('kcal', 'Avg calories', n.kcal, p.kcal, n.kcal ? `${fmt(n.kcal)} kcal` : '—', (d) => `${fmt(d)}`),
    stat('protein', 'Protein goal hit', n.proteinDays, p.proteinDays, `${n.proteinDays} days`, (d) => String(d)),
    stat('steps', 'Steps', n.steps, p.steps, n.steps ? fmt(n.steps) : '—', fmt),
    stat('sleep', 'Avg sleep', n.sleep, p.sleep, n.sleep ? hm(n.sleep) : '—', hm),
    stat('water', 'Water', n.water, p.water, `${n.water.toFixed(1)} L`, (d) => `${d.toFixed(1)} L`),
    stat('xp', 'XP earned', n.xp, p.xp, fmt(n.xp), fmt),
    { id: 'streak', label: 'Streak', value: `${currentStreak(state)} days`, raw: currentStreak(state), delta: '', up: true },
  ];

  const s = fromKey(start);
  const e = fromKey(end);
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  const label = s.getMonth() === e.getMonth() ? `${s.getDate()}–${e.getDate()} ${month(e)}` : `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)}`;

  const headline =
    n.prs > 0
      ? `${n.prs} new PR${n.prs > 1 ? 's' : ''} this week 🏆`
      : n.lockedDays >= 6
        ? 'Almost perfect week 🔒'
        : n.workoutCount >= 4
          ? 'Big training week 💪'
          : n.workoutCount > 0
            ? 'You showed up. Keep going.'
            : 'A fresh week is waiting.';

  return {
    start,
    end,
    label,
    workouts: [...n.workouts].sort((a, b) => (a.date < b.date ? -1 : 1)),
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const future = date > todayKey();
      return {
        date,
        minutes: n.workouts.filter((w) => w.date === date).reduce((t, w) => t + w.durationMin, 0),
        progress: future ? 0 : dayProgress(state, date),
        locked: !future && isLockedIn(state, date),
      };
    }),
    stats,
    headline,
  };
}

/** All stats you can choose from, in display order. */
export const REVIEW_STAT_IDS: ReviewStatId[] = [
  'workouts',
  'activeMinutes',
  'distance',
  'volume',
  'lockedDays',
  'prs',
  'kcal',
  'protein',
  'steps',
  'sleep',
  'water',
  'xp',
  'streak',
];
