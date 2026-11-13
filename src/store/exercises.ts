/**
 * Everything about exercises: history, personal records, progress hints,
 * muscles trained this week and the plate calculator.
 */
import { EXERCISE_LIBRARY, libraryExercise } from '@/data/exercises';
import { startOfWeek, todayKey } from './dates';
import type { AppState, Exercise, ExerciseSet, MuscleGroup, PersonalRecord, Workout } from './types';

const key = (name: string) => name.trim().toLowerCase();

/** Estimated one-rep max (Epley). Single reps count as is. */
export function oneRepMax(set: Pick<ExerciseSet, 'reps' | 'weight'>): number {
  if (set.reps <= 0 || set.weight <= 0) return 0;
  return set.reps === 1 ? set.weight : Math.round(set.weight * (1 + set.reps / 30) * 10) / 10;
}

const working = (sets: ExerciseSet[]) => sets.filter((s) => !s.warmup && s.reps > 0);

export type HistoryEntry = { workoutId: string; date: string; sets: ExerciseSet[] };

/** Every time you did this exercise, newest first. */
export function exerciseHistory(state: AppState, name: string, before?: Workout): HistoryEntry[] {
  const k = key(name);
  // Newest first. Two workouts on the same day: the one logged later counts as newer.
  return state.workouts
    .map((w, order) => ({ w, order }))
    .filter(({ w }) => w.id !== before?.id && w.exercises?.some((e) => key(e.name) === k))
    .sort((a, b) => (a.w.date < b.w.date ? 1 : a.w.date > b.w.date ? -1 : b.order - a.order))
    .map(({ w }) => ({ workoutId: w.id, date: w.date, sets: w.exercises!.find((e) => key(e.name) === k)!.sets }));
}

export type Records = {
  bestWeight: { weight: number; reps: number; date: string } | null;
  best1RM: { value: number; weight: number; reps: number; date: string } | null;
  bestVolume: { value: number; date: string } | null;
  sessions: number;
};

/** Your records for an exercise (optionally ignoring one workout, e.g. the one in progress). */
export function exerciseRecords(state: AppState, name: string, before?: Workout): Records {
  const history = exerciseHistory(state, name, before);
  const r: Records = { bestWeight: null, best1RM: null, bestVolume: null, sessions: history.length };
  for (const h of history) {
    const sets = working(h.sets);
    for (const s of sets) {
      if (!r.bestWeight || s.weight > r.bestWeight.weight || (s.weight === r.bestWeight.weight && s.reps > r.bestWeight.reps)) {
        r.bestWeight = { weight: s.weight, reps: s.reps, date: h.date };
      }
      const orm = oneRepMax(s);
      if (!r.best1RM || orm > r.best1RM.value) r.best1RM = { value: orm, weight: s.weight, reps: s.reps, date: h.date };
    }
    const volume = sets.reduce((t, s) => t + s.reps * s.weight, 0);
    if (volume > 0 && (!r.bestVolume || volume > r.bestVolume.value)) r.bestVolume = { value: volume, date: h.date };
  }
  return r;
}

/** Records broken by `workout`, compared with everything before it. */
export function detectRecords(state: AppState, workout: Workout): PersonalRecord[] {
  const prs: PersonalRecord[] = [];
  for (const ex of workout.exercises ?? []) {
    const sets = working(ex.sets);
    if (sets.length === 0) continue;
    const before = exerciseRecords(state, ex.name, workout);
    if (before.sessions === 0) continue; // first time: nothing to beat yet
    const topWeight = Math.max(...sets.map((s) => s.weight));
    const top1RM = Math.max(...sets.map(oneRepMax));
    const volume = sets.reduce((t, s) => t + s.reps * s.weight, 0);
    if (before.bestWeight && topWeight > before.bestWeight.weight) prs.push({ exercise: ex.name, kind: 'weight', value: topWeight });
    else if (before.best1RM && top1RM > before.best1RM.value) prs.push({ exercise: ex.name, kind: '1rm', value: top1RM });
    else if (before.bestVolume && volume > before.bestVolume.value) prs.push({ exercise: ex.name, kind: 'volume', value: volume });
  }
  return prs;
}

export function describeRecord(pr: PersonalRecord): string {
  switch (pr.kind) {
    case 'weight':
      return `${pr.exercise}: ${pr.value} kg — heaviest ever`;
    case '1rm':
      return `${pr.exercise}: est. 1RM ${pr.value} kg`;
    case 'volume':
      return `${pr.exercise}: ${pr.value.toLocaleString('en-US')} kg volume`;
  }
}

/**
 * Progressive overload hint: if every working set last time hit 8+ reps,
 * suggest a bit more weight; otherwise repeat last time.
 */
export function suggestNext(state: AppState, name: string): { sets: ExerciseSet[]; hint: string } | null {
  const last = exerciseHistory(state, name)[0];
  if (!last) return null;
  const sets = working(last.sets);
  if (sets.length === 0) return null;
  const allStrong = sets.every((s) => s.reps >= 8);
  const step = libraryExercise(name)?.equipment === 'dumbbell' ? 2 : 2.5;
  return allStrong
    ? { sets: sets.map((s) => ({ reps: s.reps, weight: s.weight + step })), hint: `All sets hit 8+ reps last time — try +${step} kg` }
    : { sets: sets.map((s) => ({ reps: s.reps, weight: s.weight })), hint: 'Match last time, then add reps' };
}

/** Working sets per muscle group this week. */
export function muscleSetsThisWeek(state: AppState): Record<MuscleGroup, number> {
  const since = startOfWeek(todayKey());
  const counts = Object.fromEntries(Object.keys(MUSCLE_GROUP_ORDER).map((m) => [m, 0])) as Record<MuscleGroup, number>;
  for (const w of state.workouts.filter((x) => x.date >= since)) {
    for (const ex of w.exercises ?? []) {
      const muscle = muscleOf(state, ex.name);
      if (muscle) counts[muscle] += working(ex.sets).length;
    }
  }
  return counts;
}

const MUSCLE_GROUP_ORDER: Record<MuscleGroup, number> = {
  chest: 0,
  back: 1,
  shoulders: 2,
  biceps: 3,
  triceps: 4,
  quads: 5,
  hamstrings: 6,
  glutes: 7,
  calves: 8,
  core: 9,
  cardio: 10,
  'full body': 11,
};

export function muscleOf(state: AppState, name: string): MuscleGroup | undefined {
  return libraryExercise(name)?.muscle ?? state.customExercises.find((e) => key(e.name) === key(name))?.muscle;
}

/** Library + your own exercises, with how often and how recently you did each. */
export function allExercises(state: AppState) {
  const seen = new Map<string, { name: string; muscle: MuscleGroup; lastDate?: string; times: number }>();
  for (const e of EXERCISE_LIBRARY) seen.set(key(e.name), { name: e.name, muscle: e.muscle, times: 0 });
  for (const e of state.customExercises) seen.set(key(e.name), { name: e.name, muscle: e.muscle, times: 0 });
  for (const w of state.workouts) {
    for (const ex of w.exercises ?? []) {
      const k = key(ex.name);
      const item = seen.get(k) ?? { name: ex.name, muscle: 'full body' as MuscleGroup, times: 0 };
      item.times++;
      if (!item.lastDate || w.date > item.lastDate) item.lastDate = w.date;
      seen.set(k, item);
    }
  }
  return [...seen.values()];
}

/** Plates per side for a barbell. */
export function platesPerSide(total: number, barKg = 20, available = [25, 20, 15, 10, 5, 2.5, 1.25]): number[] {
  let remaining = (total - barKg) / 2;
  const plates: number[] = [];
  for (const p of available) {
    while (remaining >= p - 1e-9) {
      plates.push(p);
      remaining -= p;
    }
  }
  return plates;
}

export function exerciseVolume(ex: Exercise): number {
  return working(ex.sets).reduce((t, s) => t + s.reps * s.weight, 0);
}
