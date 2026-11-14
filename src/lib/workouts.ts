/** Starting live workouts: from scratch, from a routine or from a program day. */
import { program as findProgram, type Program, type ProgramDay } from '@/data/programs';
import { exerciseHistory, isLowerBody, suggestNext } from '@/store/exercises';
import { newId } from '@/store/logic';
import type { ActiveWorkout, AppState, Exercise, Routine } from '@/store/types';

type Dispatch = (a: { type: 'setActiveWorkout'; workout: ActiveWorkout | null }) => void;

/** Sets for an exercise in a new workout: last time's numbers, so you only tick them off. */
export function prefillSets(state: AppState, name: string, count?: number): Exercise['sets'] {
  const last = exerciseHistory(state, name)[0];
  const n = count ?? last?.sets.length ?? 3;
  return Array.from({ length: Math.max(1, n) }, (_, i) => {
    const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
    return { reps: prev?.reps ?? 0, weight: prev?.weight ?? 0, seconds: prev?.seconds, meters: prev?.meters, warmup: prev?.warmup, done: false };
  });
}

export function startWorkout(state: AppState, dispatch: Dispatch, routine?: Routine): ActiveWorkout {
  const workout: ActiveWorkout = {
    id: newId(),
    startedAt: new Date().toISOString(),
    type: 'gym',
    title: routine?.name ?? defaultTitle(),
    routineId: routine?.id,
    exercises: (routine?.exercises ?? []).map((e) => ({ name: e.name, restSeconds: e.restSeconds, sets: prefillSets(state, e.name, e.sets) })),
  };
  dispatch({ type: 'setActiveWorkout', workout });
  return workout;
}

/** The program you follow and the day that's up next. */
export function nextProgramDay(state: AppState): { program: Program; day: ProgramDay; index: number } | null {
  const p = findProgram(state.program?.id);
  if (!p || !state.program) return null;
  const index = state.program.nextDay % p.days.length;
  return { program: p, day: p.days[index], index };
}

/** Start a program day: target reps from the program, weights from last time plus the progression step. */
export function startProgramDay(state: AppState, dispatch: Dispatch, p: Program, day: ProgramDay): ActiveWorkout {
  const exercises: Exercise[] = day.exercises.map((e) => {
    const step = p.step[isLowerBody(state, e.name) ? 1 : 0];
    const next = suggestNext(state, e.name, e.reps, step);
    const weight = next?.sets[0]?.weight ?? 0;
    return {
      name: e.name,
      restSeconds: e.restSeconds,
      targetReps: e.reps,
      sets: Array.from({ length: e.sets }, () => ({ reps: e.reps, weight, done: false })),
    };
  });
  const workout: ActiveWorkout = {
    id: newId(),
    startedAt: new Date().toISOString(),
    type: 'gym',
    title: day.name,
    exercises,
    programDay: `${p.id}:${day.id}`,
  };
  dispatch({ type: 'setActiveWorkout', workout });
  return workout;
}

function defaultTitle() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning workout' : h < 18 ? 'Afternoon workout' : 'Evening workout';
}

/** Where a picked exercise goes. 'draft' hands it to the manual Log workout screen. */
export type PickerTarget = 'active' | 'routine' | 'draft';

let draftPick: string | null = null;
export function setDraftPick(name: string) {
  draftPick = name;
}
/** Log workout (manual) calls this when it comes back into focus. */
export function takeDraftPick(): string | null {
  const v = draftPick;
  draftPick = null;
  return v;
}
