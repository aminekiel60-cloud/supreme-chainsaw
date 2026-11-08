/**
 * The "rules" of Locked in: how habits, streaks and points are calculated.
 * These are plain functions (no UI), so they are easy to read and change.
 */
import { addDays, startOfWeek, todayKey } from './dates';
import type { Activity, AppState, DateKey, GoalType, Goals, Habit, HabitId, Profile, Workout } from './types';

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
    case 'steps':
      return (state.health[date]?.steps ?? 0) >= 10000 || manualDone(state, date, id);
    case 'sleep':
      return sleptBy23(state.health[date]?.sleepStart) || manualDone(state, date, id);
    default:
      return (state.checks[date] ?? []).includes(id);
  }
}

function manualDone(state: AppState, date: DateKey, id: HabitId) {
  return (state.checks[date] ?? []).includes(id);
}

/** True when you fell asleep between 18:00 and 23:00 (local time). */
function sleptBy23(sleepStart?: string) {
  if (!sleepStart) return false;
  const h = new Date(sleepStart).getHours();
  return h >= 18 && h < 23;
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

export const ACTIVITY_LEVELS: { id: Activity; label: string; detail: string; factor: number }[] = [
  { id: 'sedentary', label: 'Sedentary', detail: 'Desk job, little exercise', factor: 1.2 },
  { id: 'light', label: 'Light', detail: 'Exercise 1–3× per week', factor: 1.375 },
  { id: 'moderate', label: 'Moderate', detail: 'Exercise 3–5× per week', factor: 1.55 },
  { id: 'active', label: 'Active', detail: 'Hard training 6–7× per week', factor: 1.725 },
  { id: 'athlete', label: 'Athlete', detail: 'Training twice a day', factor: 1.9 },
];

export const GOAL_TYPES: { id: GoalType; label: string; detail: string }[] = [
  { id: 'cut', label: 'Lose fat', detail: 'About 0.5 kg per week' },
  { id: 'maintain', label: 'Maintain', detail: 'Stay at your weight, get fitter' },
  { id: 'bulk', label: 'Build muscle', detail: 'Lean gain, slight surplus' },
];

/**
 * Daily calorie and macro goals from your profile.
 * Calories: Mifflin-St Jeor BMR × activity factor, adjusted for your goal.
 * Protein: 2.0 g per kg (2.2 when losing fat). Fat: 0.8 g per kg. Carbs: the rest.
 */
export function calculateGoals(p: Profile): Goals {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const factor = ACTIVITY_LEVELS.find((a) => a.id === p.activity)?.factor ?? 1.2;
  const adjust = p.goal === 'cut' ? -500 : p.goal === 'bulk' ? 300 : 0;
  const kcal = Math.max(1200, Math.round((bmr * factor + adjust) / 10) * 10);
  const protein = Math.round(p.weightKg * (p.goal === 'cut' ? 2.2 : 2.0));
  const fat = Math.round(p.weightKg * 0.8);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}
