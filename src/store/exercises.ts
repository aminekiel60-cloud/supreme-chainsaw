/**
 * Everything about exercises: history, personal records, progress hints,
 * muscles trained this week and the plate calculator.
 */
import { EXERCISE_LIBRARY, libraryExercise } from '@/data/exercises';
import { startOfWeek, todayKey } from './dates';
import type { AppState, Exercise, ExerciseSet, MuscleGroup, PersonalRecord, Workout } from './types';

const key = (name: string) => name.trim().toLowerCase();

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

/**
 * Only real numbers you lifted: no estimated maxes.
 * bestWeight: heaviest weight (with the most reps you did at it).
 * bestVolume: most weight × reps in one session.
 */
export type Records = {
  bestWeight: { weight: number; reps: number; date: string } | null;
  bestVolume: { value: number; date: string } | null;
  sessions: number;
};

/** Your records for an exercise (optionally ignoring one workout, e.g. the one in progress). */
export function exerciseRecords(state: AppState, name: string, before?: Workout): Records {
  const history = exerciseHistory(state, name, before);
  const r: Records = { bestWeight: null, bestVolume: null, sessions: history.length };
  for (const h of history) {
    const sets = working(h.sets);
    for (const s of sets) {
      if (!r.bestWeight || s.weight > r.bestWeight.weight || (s.weight === r.bestWeight.weight && s.reps > r.bestWeight.reps)) {
        r.bestWeight = { weight: s.weight, reps: s.reps, date: h.date };
      }
    }
    const volume = sets.reduce((t, s) => t + s.reps * s.weight, 0);
    if (volume > 0 && (!r.bestVolume || volume > r.bestVolume.value)) r.bestVolume = { value: volume, date: h.date };
  }
  return r;
}

/** Most reps you ever did with this weight or more (0 if never). */
export function bestRepsAt(state: AppState, name: string, weight: number, before?: Workout): number {
  let best = 0;
  for (const h of exerciseHistory(state, name, before)) {
    for (const s of working(h.sets)) if (s.weight >= weight && s.reps > best) best = s.reps;
  }
  return best;
}

/** Is this set a record? Heavier than ever, or more reps than ever at this weight. */
export function setRecord(state: AppState, name: string, set: Pick<ExerciseSet, 'weight' | 'reps' | 'warmup'>, before?: Workout): 'weight' | 'reps' | null {
  if (set.warmup || set.reps <= 0 || set.weight <= 0) return null;
  const records = exerciseRecords(state, name, before);
  if (records.sessions === 0 || !records.bestWeight) return null; // first time: nothing to beat yet
  if (set.weight > records.bestWeight.weight) return 'weight';
  if (set.reps > bestRepsAt(state, name, set.weight, before)) return 'reps';
  return null;
}

/** Records broken by `workout`, compared with everything before it. One per exercise, the best kind first. */
export function detectRecords(state: AppState, workout: Workout): PersonalRecord[] {
  const prs: PersonalRecord[] = [];
  for (const ex of workout.exercises ?? []) {
    const sets = working(ex.sets).filter((s) => s.weight > 0);
    if (sets.length === 0) continue;
    const before = exerciseRecords(state, ex.name, workout);
    if (before.sessions === 0) continue;
    const top = sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a));
    const volume = sets.reduce((t, s) => t + s.reps * s.weight, 0);
    if (before.bestWeight && top.weight > before.bestWeight.weight) {
      prs.push({ exercise: ex.name, kind: 'weight', value: top.weight, reps: top.reps });
      continue;
    }
    const repPr = sets
      .filter((s) => s.reps > bestRepsAt(state, ex.name, s.weight, workout))
      .sort((a, b) => b.weight - a.weight)[0];
    if (repPr) prs.push({ exercise: ex.name, kind: 'reps', value: repPr.weight, reps: repPr.reps });
    else if (before.bestVolume && volume > before.bestVolume.value) prs.push({ exercise: ex.name, kind: 'volume', value: volume });
  }
  return prs;
}

export function describeRecord(pr: PersonalRecord): string {
  switch (pr.kind) {
    case 'weight':
      return `${pr.exercise}: ${pr.value} kg${pr.reps ? ` for ${pr.reps}` : ''}, heaviest ever`;
    case 'reps':
      return `${pr.exercise}: ${pr.reps} reps at ${pr.value} kg, most ever`;
    case 'volume':
      return `${pr.exercise}: ${pr.value.toLocaleString('en-US')} kg in one session, most ever`;
    default:
      return `${pr.exercise}: personal record`;
  }
}

/**
 * Progressive overload hint: if every working set last time reached the
 * target reps (8 unless a program says otherwise), suggest a bit more weight.
 * Otherwise repeat last time and add reps.
 */
export function suggestNext(
  state: AppState,
  name: string,
  target = 8,
  step?: number,
): { sets: ExerciseSet[]; hint: string; up: boolean } | null {
  const last = exerciseHistory(state, name)[0];
  if (!last) return null;
  const sets = working(last.sets);
  if (sets.length === 0 || sets.every((s) => s.weight === 0)) return null;
  const allStrong = sets.every((s) => s.reps >= target);
  const add = step ?? (libraryExercise(name)?.equipment === 'dumbbell' ? 2 : 2.5);
  return allStrong && add > 0
    ? { sets: sets.map((s) => ({ reps: Math.max(s.reps, target), weight: s.weight + add })), hint: `You hit ${target} reps in every set last time. Try ${add} kg more.`, up: true }
    : { sets: sets.map((s) => ({ reps: s.reps, weight: s.weight })), hint: 'Match last time, then try for one more rep.', up: false };
}

/** Lower-body exercises get the bigger weight step in programs. */
export function isLowerBody(state: AppState, name: string) {
  const m = muscleOf(state, name);
  return m === 'quads' || m === 'hamstrings' || m === 'glutes' || m === 'calves';
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

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
    }
  }
  return prev[b.length];
}

/** The library exercise this name is probably a typo of ("Leg extention" gives "Leg extension"), if any. */
export function closestExercise(name: string): string | null {
  const k = key(name);
  if (k.length < 4 || EXERCISE_LIBRARY.some((e) => key(e.name) === k)) return null;
  let best: { name: string; d: number } | null = null;
  for (const e of EXERCISE_LIBRARY) {
    const d = editDistance(k, key(e.name));
    if (!best || d < best.d) best = { name: e.name, d };
  }
  return best && best.d <= Math.max(2, Math.floor(k.length * 0.2)) ? best.name : null;
}

/** Everything that changes when an exercise is renamed (used to merge a typo into the right exercise). */
export function renameExercise(state: AppState, from: string, to: string): Partial<AppState> {
  const k = key(from);
  const rename = (n: string) => (key(n) === k ? to : n);
  const notes = { ...state.exerciseNotes };
  if (notes[from] && !notes[to]) notes[to] = notes[from];
  delete notes[from];
  return {
    workouts: state.workouts.map((w) => (w.exercises ? { ...w, exercises: w.exercises.map((e) => ({ ...e, name: rename(e.name) })) } : w)),
    routines: state.routines.map((r) => ({ ...r, exercises: r.exercises.map((e) => ({ ...e, name: rename(e.name) })) })),
    customExercises: state.customExercises.filter((e) => key(e.name) !== k),
    exerciseNotes: notes,
    activeWorkout: state.activeWorkout
      ? { ...state.activeWorkout, exercises: state.activeWorkout.exercises.map((e) => ({ ...e, name: rename(e.name) })) }
      : null,
  };
}
