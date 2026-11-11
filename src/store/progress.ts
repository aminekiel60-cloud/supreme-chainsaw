/**
 * XP, levels and badges. Everything is calculated from your log,
 * so it can never get out of sync and works offline.
 */
import { addDays, todayKey } from './dates';
import { HABITS, POINTS, currentStreak, dayPoints, dayProgress, habitDone, isLockedIn } from './logic';
import type { AppState, DateKey } from './types';

export const XP = {
  ...POINTS,
  perfectDayBonus: 50,
  challengeWin: 250,
};

/** Every day that has any activity in your log. */
export function activeDays(state: AppState): DateKey[] {
  return [
    ...new Set([
      ...state.food.map((f) => f.date),
      ...state.workouts.map((w) => w.date),
      ...Object.keys(state.checks),
      ...Object.keys(state.water),
      ...Object.keys(state.health),
    ]),
  ].sort();
}

export function totalXp(state: AppState): number {
  let xp = 0;
  for (const d of activeDays(state)) {
    xp += dayPoints(state, d);
    if (dayProgress(state, d) >= 1) xp += XP.perfectDayBonus;
  }
  return xp + state.challengeWins.length * XP.challengeWin;
}

/** XP needed to reach a level: 0, 150, 450, 900, 1500, … (grows each level). */
export const xpForLevel = (level: number) => 75 * level * (level - 1);

const TITLES = ['Rookie', 'Starter', 'Grinder', 'Athlete', 'Competitor', 'Beast', 'Elite', 'Champion', 'Titan', 'Legend'];

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  return {
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))],
    xp,
    intoLevel: xp - from,
    needed: to - from,
    progress: (xp - from) / (to - from),
  };
}

// ───────────── Badges ─────────────

export type Badge = {
  id: string;
  title: string;
  detail: string;
  icon: 'flame' | 'barbell' | 'walk' | 'trophy' | 'lock-closed' | 'water' | 'star' | 'ribbon' | 'medal' | 'flash';
  tier: 'bronze' | 'silver' | 'gold' | 'legend';
  earned: boolean;
  /** 0–1 towards earning it */
  progress: number;
};

export const TIER_COLORS: Record<Badge['tier'], string> = {
  bronze: '#D08B4F',
  silver: '#C9D1D9',
  gold: '#FFD34D',
  legend: '#A3FF3F',
};

function bestStreak(state: AppState): number {
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of activeDays(state)) {
    const locked = isLockedIn(state, d);
    run = locked && prev && addDays(prev, 1) === d ? run + 1 : locked ? 1 : 0;
    best = Math.max(best, run);
    prev = locked ? d : null;
  }
  return Math.max(best, currentStreak(state));
}

export function badges(state: AppState): Badge[] {
  const days = activeDays(state);
  const streak = bestStreak(state);
  const workouts = state.workouts.length;
  const km = state.workouts.reduce((t, w) => t + (w.distanceKm ?? 0), 0);
  const lockedDays = days.filter((d) => isLockedIn(state, d)).length;
  const perfectDays = days.filter((d) => dayProgress(state, d) >= 1).length;
  const waterDays = days.filter((d) => habitDone(state, d, 'water')).length;
  const level = levelInfo(totalXp(state)).level;
  const wins = state.challengeWins.length;

  const make = (
    id: string,
    title: string,
    detail: string,
    icon: Badge['icon'],
    tier: Badge['tier'],
    value: number,
    target: number,
  ): Badge => ({ id, title, detail, icon, tier, earned: value >= target, progress: Math.min(1, value / target) });

  return [
    make('streak-7', 'On fire', '7-day streak', 'flame', 'bronze', streak, 7),
    make('streak-30', 'Unbreakable', '30-day streak', 'flame', 'gold', streak, 30),
    make('streak-100', 'Locked for life', '100-day streak', 'flame', 'legend', streak, 100),
    make('workouts-10', 'Warming up', '10 workouts', 'barbell', 'bronze', workouts, 10),
    make('workouts-50', 'Regular', '50 workouts', 'barbell', 'silver', workouts, 50),
    make('workouts-200', 'Iron will', '200 workouts', 'barbell', 'gold', workouts, 200),
    make('km-50', 'Road runner', '50 km in total', 'walk', 'bronze', km, 50),
    make('km-500', 'Ultra', '500 km in total', 'walk', 'gold', km, 500),
    make('locked-30', 'Locked in', '30 locked-in days', 'lock-closed', 'silver', lockedDays, 30),
    make('perfect-10', 'Perfectionist', '10 perfect days (100%)', 'star', 'gold', perfectDays, 10),
    make('water-14', 'Hydrated', 'Water goal on 14 days', 'water', 'bronze', waterDays, 14),
    make('challenge-1', 'Challenger', 'Win a friend challenge', 'trophy', 'silver', wins, 1),
    make('challenge-5', 'Champion', 'Win 5 friend challenges', 'medal', 'legend', wins, 5),
    make('level-10', 'Double digits', 'Reach level 10', 'flash', 'gold', level, 10),
  ];
}

/** Today's habits that are still open, for nudges on Home. */
export function openHabitsToday(state: AppState) {
  return HABITS.filter((h) => !habitDone(state, todayKey(), h.id));
}
