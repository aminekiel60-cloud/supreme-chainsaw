/**
 * The "rules" of Locked in: how habits, streaks and points are calculated.
 * These are plain functions (no UI), so they are easy to read and change.
 */
import { addDays, startOfWeek, todayKey } from './dates';
import type { Activity, AppState, DateKey, FoodEntry, GoalType, Goals, Habit, HabitId, Profile, Workout, WorkoutType } from './types';

export const HABITS: Habit[] = [
  { id: 'protein', title: 'Hit protein goal', kind: 'auto' },
  { id: 'calories', title: 'Stay within calorie goal', kind: 'auto' },
  { id: 'workout', title: 'Train or play sport', kind: 'auto' },
  { id: 'steps', title: 'Steps goal', kind: 'manual' },
  { id: 'water', title: 'Water goal', kind: 'auto' },
  { id: 'sleep', title: 'Asleep on time', kind: 'manual' },
];

/** Default habit targets; you can change them in Goals. */
export const DEFAULT_HABIT_GOALS = { steps: 10000, waterMl: 2500, sleepByHour: 23 };

/** The habit's label with your own targets, e.g. "8,000 steps" or "Drink 2.5 L water". */
export function habitTitle(state: AppState, id: HabitId): string {
  const g = state.goals;
  switch (id) {
    case 'steps':
      return `${g.steps.toLocaleString('en-US')} steps`;
    case 'water':
      return `Drink ${(g.waterMl / 1000).toLocaleString('en-US')} L water`;
    case 'sleep':
      return `Asleep by ${String(g.sleepByHour % 24).padStart(2, '0')}:00`;
    default:
      return HABITS.find((h) => h.id === id)!.title;
  }
}

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
      return (state.health[date]?.steps ?? 0) >= state.goals.steps || manualDone(state, date, id);
    case 'water':
      return (state.water[date] ?? 0) >= state.goals.waterMl;
    case 'sleep':
      return sleptOnTime(state.health[date]?.sleepStart, state.goals.sleepByHour) || manualDone(state, date, id);
    default:
      return (state.checks[date] ?? []).includes(id);
  }
}

function manualDone(state: AppState, date: DateKey, id: HabitId) {
  return (state.checks[date] ?? []).includes(id);
}

/** True when you fell asleep between 18:00 and your "asleep by" hour (local time). */
function sleptOnTime(sleepStart: string | undefined, byHour: number) {
  if (!sleepStart) return false;
  const d = new Date(sleepStart);
  // Hours after midnight count as 24, 25, … so "asleep by 24:00" works too.
  const h = d.getHours() < 12 ? d.getHours() + 24 : d.getHours();
  return h >= 18 && h + d.getMinutes() / 60 <= byHour;
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

/** Every sport you can log, with how its speed is shown. */
export const SPORTS: {
  id: WorkoutType;
  label: string;
  title: string;
  icon: 'barbell' | 'walk' | 'footsteps' | 'bicycle' | 'water' | 'tennisball';
  distance: boolean;
}[] = [
  { id: 'gym', label: 'Gym', title: 'Gym session', icon: 'barbell', distance: false },
  { id: 'run', label: 'Run', title: 'Run', icon: 'walk', distance: true },
  { id: 'walk', label: 'Walk', title: 'Walk', icon: 'footsteps', distance: true },
  { id: 'cycle', label: 'Cycle', title: 'Ride', icon: 'bicycle', distance: true },
  { id: 'swim', label: 'Swim', title: 'Swim', icon: 'water', distance: true },
  { id: 'other', label: 'Other', title: 'Workout', icon: 'tennisball', distance: false },
];

export const sport = (type: WorkoutType) => SPORTS.find((s) => s.id === type) ?? SPORTS[SPORTS.length - 1];

const mmss = (minutes: number) => {
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Speed in the unit each sport uses: pace per km for running and walking,
 * km/h for cycling, pace per 100 m for swimming. Null without distance/time.
 */
export function pace(w: Workout): string | null {
  if (!w.distanceKm || !w.durationMin) return null;
  switch (w.type) {
    case 'cycle':
      return `${(w.distanceKm / (w.durationMin / 60)).toFixed(1)} km/h`;
    case 'swim':
      return `${mmss(w.durationMin / (w.distanceKm * 10))} /100m`;
    default:
      return `${mmss(w.durationMin / w.distanceKm)} /km`;
  }
}

/** Distance as the sport usually shows it (swims in metres). */
export function formatDistance(w: Workout): string {
  if (!w.distanceKm) return '';
  return w.type === 'swim' ? `${Math.round(w.distanceKm * 1000)} m` : `${w.distanceKm} km`;
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
export function calculateGoals(p: Profile): Pick<Goals, 'kcal' | 'protein' | 'carbs' | 'fat'> {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const factor = ACTIVITY_LEVELS.find((a) => a.id === p.activity)?.factor ?? 1.2;
  const adjust = p.goal === 'cut' ? -500 : p.goal === 'bulk' ? 300 : 0;
  const kcal = Math.max(1200, Math.round((bmr * factor + adjust) / 10) * 10);
  const protein = Math.round(p.weightKg * (p.goal === 'cut' ? 2.2 : 2.0));
  const fat = Math.round(p.weightKg * 0.8);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

type Base = NonNullable<FoodEntry['base']>;

/** Totals for `amount` of a food, from its base values (per 100 g, or per serving). */
export function fromBase(base: Omit<Base, 'amount'>, amount: number) {
  const f = base.unit === 'g' ? amount / 100 : amount;
  const r1 = (n: number) => Math.round(n * f * 10) / 10;
  return { kcal: Math.round(base.kcal * f), protein: r1(base.protein), carbs: r1(base.carbs), fat: r1(base.fat) };
}

/** The base of an entry; older entries without one count as "1 serving". */
export function baseOf(entry: FoodEntry): Base {
  return entry.base ?? { amount: 1, unit: 'serving', kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat };
}

/** "150 g", "2 servings" or "" (for exactly one serving). */
export function amountLabel(entry: FoodEntry): string {
  const b = entry.base;
  if (!b) return '';
  if (b.unit === 'g') return `${b.amount} g`;
  return b.amount === 1 ? '' : `${b.amount} servings`;
}

export type Readiness = { score: number; label: string; advice: string; parts: { sleep: number; heart: number | null; load: number } };

/**
 * Readiness for today (0–100), from last night's sleep (50%), resting heart rate
 * and HRV vs. your own 14-day average (30%) and yesterday's training (20%).
 * Null without sleep data — it needs a watch synced through Health Connect.
 */
export function readiness(state: AppState, date: DateKey = todayKey()): Readiness | null {
  const today = state.health[date];
  if (!today || today.sleepMinutes <= 0) return null;

  const sleep = Math.min(1, today.sleepMinutes / 480);

  const baselineDays = Array.from({ length: 14 }, (_, i) => state.health[addDays(date, -(i + 1))]?.restingHeartRate).filter(
    (x): x is number => typeof x === 'number' && x > 0,
  );
  const signals: number[] = [];
  if (today.restingHeartRate && baselineDays.length >= 3) {
    const baseline = baselineDays.reduce((t, x) => t + x, 0) / baselineDays.length;
    // At or below your normal = full marks; +10 bpm above = zero.
    signals.push(Math.max(0, Math.min(1, 1 - (today.restingHeartRate - baseline) / 10)));
  }
  const hrvDays = Array.from({ length: 14 }, (_, i) => state.health[addDays(date, -(i + 1))]?.hrv).filter(
    (x): x is number => typeof x === 'number' && x > 0,
  );
  if (today.hrv && hrvDays.length >= 3) {
    const baseline = hrvDays.reduce((t, x) => t + x, 0) / hrvDays.length;
    // At or above your normal = full marks; 30% below = zero.
    signals.push(Math.max(0, Math.min(1, 1 - (baseline - today.hrv) / (baseline * 0.3))));
  }
  const heart = signals.length ? signals.reduce((t, x) => t + x, 0) / signals.length : null;

  const yesterdayMinutes = workoutsOn(state, addDays(date, -1)).reduce((t, w) => t + w.durationMin, 0);
  const load = yesterdayMinutes <= 30 ? 1 : Math.max(0.5, 1 - (yesterdayMinutes - 30) / 180);

  // Without heart-rate history, sleep and load share its weight.
  const score = Math.round(heart === null ? (sleep * 0.7 + load * 0.3) * 100 : (sleep * 0.5 + heart * 0.3 + load * 0.2) * 100);
  const [label, advice] =
    score >= 80
      ? ['Ready to push', 'Great day for a hard session or a PR attempt.']
      : score >= 60
        ? ['Good to go', 'Train as planned.']
        : score >= 40
          ? ['Take it steady', 'Keep it moderate today: technique, cardio or a lighter session.']
          : ['Recover', 'Your body needs rest: walk, stretch and get to bed early.'];
  return { score, label, advice, parts: { sleep, heart, load } };
}
