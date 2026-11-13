/** Starting live workouts, from scratch or from a routine. */
import { exerciseHistory } from '@/store/exercises';
import { newId } from '@/store/logic';
import type { ActiveWorkout, AppState, Exercise, Routine } from '@/store/types';

type Dispatch = (a: { type: 'setActiveWorkout'; workout: ActiveWorkout | null }) => void;

/** Sets for an exercise in a new workout: last time's numbers, so you only tick them off. */
export function prefillSets(state: AppState, name: string, count?: number): Exercise['sets'] {
  const last = exerciseHistory(state, name)[0];
  const n = count ?? last?.sets.length ?? 3;
  return Array.from({ length: Math.max(1, n) }, (_, i) => {
    const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
    return { reps: prev?.reps ?? 0, weight: prev?.weight ?? 0, warmup: prev?.warmup, done: false };
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
