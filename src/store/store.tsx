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
import type { AppState, DateKey, FoodEntry, Goals, HabitId, HealthDay, MyFood, Profile, Settings, Workout } from './types';

const STORAGE_KEY = 'lockedin:v1';

const initialState: AppState = {
  profile: null,
  settings: { healthConnect: false, reminders: true, reminderHour: 20, bottleMl: 500, seenLevel: 0 },
  goals: { ...DEFAULT_HABIT_GOALS, kcal: 2400, protein: 160, carbs: 260, fat: 75 },
  health: {},
  water: {},
  food: [],
  myFoods: [],
  challengeWins: [],
  workouts: [],
  checks: {},
  likes: [],
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
  | { type: 'syncHealth'; date: DateKey; day: HealthDay; workouts: Omit<Workout, 'id'>[] }
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
    case 'updateWorkout':
      return {
        ...state,
        workouts: state.workouts.map((w) => (w.id === action.id ? { ...w, ...action.changes } : w)),
      };
    case 'setSettings':
      return { ...state, settings: action.settings };
    case 'syncHealth': {
      const known = new Set(state.workouts.map((w) => w.externalId).filter(Boolean));
      const fresh = action.workouts.filter((w) => !known.has(w.externalId));
      return {
        ...state,
        health: { ...state.health, [action.date]: action.day },
        workouts: [...state.workouts, ...fresh.map((w) => ({ ...w, id: newId() }))],
      };
    }
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
