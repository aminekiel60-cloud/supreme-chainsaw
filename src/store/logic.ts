/**
 * The "rules" of Locked in: how habits, streaks and points are calculated.
 * These are plain functions (no UI), so they are easy to read and change.
 */
import { addDays, startOfWeek, todayKey } from './dates';
import type { AppState, DateKey, Habit, HabitId, Workout } from './types';

export const HABITS: Habit[] = [
  { id: 'protein', title: 'Hit protein goal', kind: 'auto' },
  { id: 'calories', title: 'Stay within calorie goal', kind: 'auto' },
  { id: 'workout', title: 'Train (gym, run or sport)', kind: 'auto' },
  { id: 'steps', title: '10,000 steps', kind: 'manual' },
  { id: 'water', title: 'Drink 3 L water', kind: 'manual' },
  { id: 'sleep', title: 'Asleep by 23:00', kind: 'manual' },
];

/** A day counts towards your streak once this share of habits is done. */
export const LOCKED_IN_THRESHOLD = 0.6;

export const POINTS = {
  perHabit: 10,
  perWorkout: 50,
  lockedInDayBonus: 25,
};

export function dayTotals(state: AppState, date: DateKey) {
  const items = state.food.filter((f) => f.date === date);
  return items.reduce(
    (t, f) => ({
      kcal: t.kcal + f.kcal,
      protein: t.protein + f.protein,
      carbs: t.carbs + f.carbs,
      fat: t.fat + f.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function workoutsOn(state: AppState, date: DateKey) {
  return state.workouts.filter((w) => w.date === date);
}

export function habitDone(state: AppState, date: DateKey, id: HabitId): boolean {
  const totals = dayTotals(state, date);
  switch (id) {
    case 'protein':
      return totals.protein >= state.goals.protein;
    case 'calories':
      // Only counts once you actually logged food that day.
      return totals.kcal > 0 && totals.kcal <= state.goals.kcal;
    case 'workout':
      return workoutsOn(state, date).length > 0;
    default:
      return (state.checks[date] ?? []).includes(id);
  }
}

/** Share of habits done on a day, from 0 to 1. */
export function dayProgress(state: AppState, date: DateKey): number {
  const done = HABITS.filter((h) => habitDone(state, date, h.id)).length;
  return done / HABITS.length;
}

export function isLockedIn(state: AppState, date: DateKey) {
  return dayProgress(state, date) >= LOCKED_IN_THRESHOLD;
}

/**
 * Consecutive locked-in days ending today.
 * If today isn't locked in yet, the streak from yesterday still counts.
 */
export function currentStreak(state: AppState): number {
  let day = todayKey();
  if (!isLockedIn(state, day)) day = addDays(day, -1);
  let streak = 0;
  while (isLockedIn(state, day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function dayPoints(state: AppState, date: DateKey): number {
  const habits = HABITS.filter((h) => habitDone(state, date, h.id)).length;
  const workouts = workoutsOn(state, date).length;
  return (
    habits * POINTS.perHabit +
    workouts * POINTS.perWorkout +
    (isLockedIn(state, date) ? POINTS.lockedInDayBonus : 0)
  );
}

/** Points earned this week (Monday up to today). */
export function weekPoints(state: AppState): number {
  const today = todayKey();
  let day = startOfWeek(today);
  let total = 0;
  while (day <= today) {
    total += dayPoints(state, day);
    day = addDays(day, 1);
  }
  return total;
}

export function totalPoints(state: AppState): number {
  const days = new Set<DateKey>([
    ...state.food.map((f) => f.date),
    ...state.workouts.map((w) => w.date),
    ...Object.keys(state.checks),
  ]);
  let total = 0;
  days.forEach((d) => (total += dayPoints(state, d)));
  return total;
}

export type Achievement = { id: string; title: string; unlocked: boolean };

export function achievements(state: AppState): Achievement[] {
  const streak = currentStreak(state);
  const km = state.workouts.reduce((t, w) => t + (w.distanceKm ?? 0), 0);
  return [
    { id: 'first-workout', title: 'First workout', unlocked: state.workouts.length >= 1 },
    { id: 'first-meal', title: 'First meal logged', unlocked: state.food.length >= 1 },
    { id: 'streak-3', title: '3-day streak', unlocked: streak >= 3 },
    { id: 'streak-7', title: '7-day streak', unlocked: streak >= 7 },
    { id: 'km-10', title: '10 km run total', unlocked: km >= 10 },
    { id: 'workouts-10', title: '10 workouts', unlocked: state.workouts.length >= 10 },
  ];
}

/** Running pace as 'm:ss /km', or null without distance/time. */
export function pace(w: Workout): string | null {
  if (!w.distanceKm || !w.durationMin) return null;
  const perKm = w.durationMin / w.distanceKm;
  const min = Math.floor(perKm);
  const sec = Math.round((perKm - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
