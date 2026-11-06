/** A day is stored as a 'YYYY-MM-DD' string in the phone's local time. */
export type DateKey = string;

export type Meal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

export type FoodEntry = {
  id: string;
  date: DateKey;
  meal: Meal;
  name: string;
  kcal: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
};

export type WorkoutType = 'gym' | 'run' | 'other';

export type ExerciseSet = { reps: number; weight: number };

export type Exercise = { name: string; sets: ExerciseSet[] };

export type Workout = {
  id: string;
  date: DateKey;
  type: WorkoutType;
  title: string;
  durationMin: number;
  distanceKm?: number; // runs and other cardio
  exercises?: Exercise[]; // gym sessions
};

export type Goals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/**
 * Habits are either checked automatically from your logs ('auto')
 * or ticked by hand ('manual').
 */
export type HabitId = 'protein' | 'calories' | 'workout' | 'steps' | 'water' | 'sleep';

export type Habit = {
  id: HabitId;
  title: string;
  kind: 'auto' | 'manual';
};

export type AppState = {
  goals: Goals;
  food: FoodEntry[];
  workouts: Workout[];
  /** Manual habits ticked per day, e.g. { '2026-10-27': ['water', 'steps'] } */
  checks: Record<DateKey, HabitId[]>;
  /** Social feed post ids you liked */
  likes: string[];
};
