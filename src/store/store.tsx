/**
 * App data store.
 * Holds everything you log and saves it on the phone (AsyncStorage),
 * so your data is still there after closing the app.
 * In a later stage this is where syncing to a cloud account plugs in.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';

import { newId } from './logic';
import type { AppState, DateKey, FoodEntry, Goals, HabitId, Workout } from './types';

const STORAGE_KEY = 'lockedin:v1';

const initialState: AppState = {
  goals: { kcal: 2400, protein: 160, carbs: 260, fat: 75 },
  food: [],
  workouts: [],
  checks: {},
  likes: [],
};

type Action =
  | { type: 'load'; state: AppState }
  | { type: 'addFood'; entry: Omit<FoodEntry, 'id'> }
  | { type: 'removeFood'; id: string }
  | { type: 'addWorkout'; workout: Omit<Workout, 'id'> }
  | { type: 'removeWorkout'; id: string }
  | { type: 'toggleHabit'; date: DateKey; habit: HabitId }
  | { type: 'toggleLike'; postId: string }
  | { type: 'setGoals'; goals: Goals }
  | { type: 'reset' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return { ...initialState, ...action.state };
    case 'addFood':
      return { ...state, food: [...state.food, { ...action.entry, id: newId() }] };
    case 'removeFood':
      return { ...state, food: state.food.filter((f) => f.id !== action.id) };
    case 'addWorkout':
      return { ...state, workouts: [...state.workouts, { ...action.workout, id: newId() }] };
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

  return <StoreContext.Provider value={{ state, dispatch, ready }}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
