/** Year in review: everything you did in one calendar year. */
import { MUSCLE_LABELS } from '@/data/exercises';
import { muscleOf } from './exercises';
import { activeDays } from './progress';
import { isLockedIn } from './logic';
import type { AppState, MuscleGroup } from './types';

export function yearsWithData(state: AppState): number[] {
  const years = new Set<number>([new Date().getFullYear()]);
  for (const w of state.workouts) years.add(Number(w.date.slice(0, 4)));
  return [...years].sort((a, b) => b - a);
}

export function yearReview(state: AppState, year: number) {
  const y = String(year);
  const workouts = state.workouts.filter((w) => w.date.startsWith(y));
  const minutes = workouts.reduce((t, w) => t + w.durationMin, 0);
  const km = workouts.reduce((t, w) => t + (w.distanceKm ?? 0), 0);
  const prs = workouts.reduce((t, w) => t + (w.prs?.length ?? 0), 0);
  let volume = 0;
  let sets = 0;
  const sessions = new Map<string, number>();
  const best = new Map<string, number>();
  const muscles = new Map<MuscleGroup, number>();
  for (const w of workouts) {
    for (const e of w.exercises ?? []) {
      sessions.set(e.name, (sessions.get(e.name) ?? 0) + 1);
      for (const x of e.sets) {
        if (x.warmup) continue;
        sets++;
        volume += x.reps * x.weight;
        if (x.weight > (best.get(e.name) ?? 0) && x.reps > 0) best.set(e.name, x.weight);
        const m = muscleOf(state, e.name);
        if (m) muscles.set(m, (muscles.get(m) ?? 0) + 1);
      }
    }
  }
  const days = activeDays(state).filter((d) => d.startsWith(y));
  const locked = days.filter((d) => isLockedIn(state, d));
  // Longest run of locked-in days in a row.
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of locked.sort()) {
    const t = new Date(d).getTime() / 86400000;
    run = prev !== null && Math.round(t - prev) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  const months = Array.from({ length: 12 }, (_, i) => workouts.filter((w) => Number(w.date.slice(5, 7)) === i + 1).length);
  const topExercise = [...sessions.entries()].sort((a, b) => b[1] - a[1])[0];
  const topMuscle = [...muscles.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestLifts = [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {
    year,
    workouts: workouts.length,
    hours: Math.round(minutes / 60),
    km: Math.round(km * 10) / 10,
    volume,
    sets,
    prs,
    lockedDays: locked.length,
    longestStreak: longest,
    months,
    topExercise: topExercise ? { name: topExercise[0], times: topExercise[1] } : null,
    topMuscle: topMuscle ? MUSCLE_LABELS[topMuscle[0]] : null,
    bestLifts,
  };
}
