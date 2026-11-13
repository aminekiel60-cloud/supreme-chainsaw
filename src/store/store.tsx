/**
 * App data store.
 * Holds everything you log and saves it on the phone (AsyncStorage),
 * so your data is still there after closing the app.
 * In a later stage this is where syncing to a cloud account plugs in.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';

import { haptics } from '@/lib/haptics';

import { DEFAULT_HABIT_GOALS, calculateGoals, newId } from './logic';
import type {
  ActiveWorkout,
  AppState,
  BodyWeightEntry,
  CustomExercise,
  DateKey,
  FoodEntry,
  Goals,
  HabitId,
  HealthDay,
  MyFood,
  Profile,
  Routine,
  Settings,
  Workout,
} from './types';

const STORAGE_KEY = 'lockedin:v1';

const initialState: AppState = {
  profile: null,
  settings: {
    healthConnect: false,
    reminders: true,
    reminderHour: 20,
    bottleMl: 500,
    seenLevel: 0,
    restSeconds: 90,
    reviewStats: ['workouts', 'activeMinutes', 'volume', 'distance', 'lockedDays', 'prs'],
  },
  goals: { ...DEFAULT_HABIT_GOALS, kcal: 2400, protein: 160, carbs: 260, fat: 75 },
  health: {},
  water: {},
  food: [],
  myFoods: [],
  challengeWins: [],
  routines: [],
  activeWorkout: null,
  customExercises: [],
  bodyWeight: [],
  workouts: [],
  checks: {},
  likes: [],
  measurements: [],
  progressPhotos: [],
  savedMeals: [],
  grocery: [],
  program: null,
  exerciseNotes: {},
  avatarUrl: null,
  coachAdvice: null,
};

type Action =
  | { type: 'load'; state: AppState }
  | { type: 'addFood'; entry: Omit<FoodEntry, 'id'> }
  | { type: 'removeFood'; id: string }
  | { type: 'updateFood'; id: string; changes: Partial<Omit<FoodEntry, 'id'>> }
  | { type: 'addWorkout'; workout: Omit<Workout, 'id'> & { id?: string } }
  | { type: 'removeWorkout'; id: string }
  | { type: 'toggleHabit'; date: DateKey; habit: HabitId }
  | { type: 'toggleLike'; postId: string }
  | { type: 'setGoals'; goals: Goals }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'setSettings'; settings: Settings }
  | { type: 'addWater'; date: DateKey; ml: number }
  | { type: 'addMyFood'; food: Omit<MyFood, 'id'> }
  | { type: 'removeMyFood'; id: string }
  | { type: 'updateMyFood'; id: string; changes: Partial<Omit<MyFood, 'id'>> }
  | { type: 'updateWorkout'; id: string; changes: Partial<Workout> }
  | { type: 'winChallenge'; id: string; title: string; date: DateKey }
  | { type: 'setActiveWorkout'; workout: ActiveWorkout | null }
  /** Change some fields of the running workout, keeping everything else as it is right now. */
  | { type: 'patchActiveWorkout'; changes: Partial<ActiveWorkout> }
  | { type: 'addRoutine'; routine: Omit<Routine, 'id'> }
  | { type: 'updateRoutine'; id: string; changes: Partial<Routine> }
  | { type: 'removeRoutine'; id: string }
  | { type: 'addCustomExercise'; exercise: CustomExercise }
  | { type: 'logBodyWeight'; entry: BodyWeightEntry }
  | { type: 'removeBodyWeight'; date: DateKey }
  | { type: 'syncHealth'; date: DateKey; day: HealthDay; workouts: Omit<Workout, 'id'>[] }
  /** Any other change, worked out from the newest state. Keep `change` pure. */
  | { type: 'apply'; change: (s: AppState) => Partial<AppState> }
  | { type: 'reset' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return {
        ...initialState,
        ...action.state,
        settings: { ...initialState.settings, ...action.state.settings },
        // Data saved by older versions doesn't have the newer goal fields yet.
        goals: { ...initialState.goals, ...action.state.goals },
      };
    case 'addFood':
      return { ...state, food: [...state.food, { ...action.entry, id: newId() }] };
    case 'removeFood':
      return { ...state, food: state.food.filter((f) => f.id !== action.id) };
    case 'updateFood':
      return { ...state, food: state.food.map((f) => (f.id === action.id ? { ...f, ...action.changes } : f)) };
    case 'addWorkout':
      return { ...state, workouts: [...state.workouts, { ...action.workout, id: action.workout.id ?? newId() }] };
    case 'removeWorkout':
      return { ...state, workouts: state.workouts.filter((w) => w.id !== action.id) };
    case 'toggleHabit': {
      const day = state.checks[action.date] ?? [];
      const next = day.includes(action.habit)
        ? day.filter((h) => h !== action.habit)
        : [...day, action.habit];
      return { ...state, checks: { ...state.checks, [action.date]: next } };
    }
    case 'toggleLike': {
      const liked = state.likes.includes(action.postId);
      return {
        ...state,
        likes: liked ? state.likes.filter((l) => l !== action.postId) : [...state.likes, action.postId],
      };
    }
    case 'setGoals':
      return { ...state, goals: action.goals };
    case 'setProfile': {
      // Saving a profile recalculates your calories and macros, unless you set them yourself.
      const macros = state.goals.customMacros ? {} : calculateGoals(action.profile);
      return { ...state, profile: action.profile, goals: { ...state.goals, ...macros } };
    }
    case 'addWater': {
      const ml = Math.max(0, (state.water[action.date] ?? 0) + action.ml);
      return { ...state, water: { ...state.water, [action.date]: ml } };
    }
    case 'addMyFood':
      return { ...state, myFoods: [...state.myFoods, { ...action.food, id: newId() }] };
    case 'removeMyFood':
      return { ...state, myFoods: state.myFoods.filter((f) => f.id !== action.id) };
    case 'updateMyFood':
      return { ...state, myFoods: state.myFoods.map((f) => (f.id === action.id ? { ...f, ...action.changes } : f)) };
    case 'winChallenge':
      if (state.challengeWins.some((c) => c.id === action.id)) return state;
      return { ...state, challengeWins: [...state.challengeWins, { id: action.id, title: action.title, date: action.date }] };
    case 'patchActiveWorkout':
      return state.activeWorkout ? { ...state, activeWorkout: { ...state.activeWorkout, ...action.changes } } : state;
    case 'setActiveWorkout':
      return { ...state, activeWorkout: action.workout };
    case 'addRoutine':
      return { ...state, routines: [...state.routines, { ...action.routine, id: newId() }] };
    case 'updateRoutine':
      return { ...state, routines: state.routines.map((r) => (r.id === action.id ? { ...r, ...action.changes } : r)) };
    case 'removeRoutine':
      return { ...state, routines: state.routines.filter((r) => r.id !== action.id) };
    case 'addCustomExercise':
      if (state.customExercises.some((e) => e.name.toLowerCase() === action.exercise.name.toLowerCase())) return state;
      return { ...state, customExercises: [...state.customExercises, action.exercise] };
    case 'logBodyWeight': {
      const rest = state.bodyWeight.filter((b) => b.date !== action.entry.date);
      const bodyWeight = [...rest, action.entry].sort((a, b) => (a.date < b.date ? -1 : 1));
      // Your newest weight also updates your profile (and your calculated goals).
      const latest = bodyWeight[bodyWeight.length - 1];
      const profile = state.profile && latest.date === action.entry.date ? { ...state.profile, weightKg: latest.kg } : state.profile;
      const macros = profile && profile !== state.profile && !state.goals.customMacros ? calculateGoals(profile) : {};
      return { ...state, bodyWeight, profile, goals: { ...state.goals, ...macros } };
    }
    case 'removeBodyWeight':
      return { ...state, bodyWeight: state.bodyWeight.filter((b) => b.date !== action.date) };
    case 'updateWorkout':
      return {
        ...state,
        workouts: state.workouts.map((w) => (w.id === action.id ? { ...w, ...action.changes } : w)),
      };
    case 'setSettings':
      return { ...state, settings: action.settings };
    case 'syncHealth': {
      let workouts = state.workouts;
      for (const incoming of action.workouts) {
        const existing = workouts.find((w) => w.externalId && w.externalId === incoming.externalId);
        // A workout you logged in the app and also recorded on your watch is one workout:
        // keep yours and add the watch's heart rate and calories to it.
        const sameSession =
          existing ?? workouts.find((w) => !w.externalId && w.date === incoming.date && w.type === incoming.type);
        const fromWatch = { avgHeartRate: incoming.avgHeartRate, maxHeartRate: incoming.maxHeartRate, kcal: incoming.kcal };
        workouts = sameSession
          ? workouts.map((w) =>
              w.id === sameSession.id
                ? { ...w, ...fromWatch, externalId: incoming.externalId, distanceKm: w.distanceKm ?? incoming.distanceKm }
                : w,
            )
          : [...workouts, { ...incoming, id: newId() }];
      }
      // A weight from a smart scale becomes a body-weight entry (unless you logged one yourself that day).
      const scale = action.day.weightKg;
      const bodyWeight =
        scale && !state.bodyWeight.some((b) => b.date === action.date)
          ? [...state.bodyWeight, { date: action.date, kg: scale }].sort((a, b) => (a.date < b.date ? -1 : 1))
          : state.bodyWeight;
      return { ...state, health: { ...state.health, [action.date]: action.day }, workouts, bodyWeight };
    }
    case 'apply':
      return { ...state, ...action.change(state) };
    case 'reset':
      return initialState;
  }
}

type Store = { state: AppState; dispatch: (a: Action) => void; ready: boolean };

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);

  // Load saved data once when the app starts.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) dispatch({ type: 'load', state: JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Save after every change (only after the first load finished).
  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  // A satisfying tap whenever you log food or a workout.
  const dispatchWithFeedback = useCallback((action: Action) => {
    if (action.type === 'addFood' || action.type === 'addWorkout') haptics.add();
    dispatch(action);
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch: dispatchWithFeedback, ready }}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
