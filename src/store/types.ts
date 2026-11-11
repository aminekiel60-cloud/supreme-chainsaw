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

export type WorkoutType = 'gym' | 'run' | 'walk' | 'cycle' | 'swim' | 'other';

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
  /** Set when imported from Health Connect, so it's never imported twice */
  externalId?: string;
  /** Photo on this phone (file URI), shared to the feed with the workout */
  photoUri?: string;
  /** Friends who trained with you */
  tagged?: { id: string; name: string }[];
};

/** A food you created yourself, reusable from Add food. Values per portion. */
export type MyFood = {
  id: string;
  name: string;
  /** e.g. "1 bowl (350 g)" */
  portion: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Goals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** True when you set the macros yourself instead of using the calculated ones */
  customMacros?: boolean;
  /** Daily habit targets */
  steps: number;
  waterMl: number;
  /** "Asleep by" hour, e.g. 23 = asleep by 23:00 */
  sleepByHour: number;
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

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type GoalType = 'cut' | 'maintain' | 'bulk';

/** Filled in during onboarding; used to calculate your daily goals. */
export type Profile = {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: GoalType;
};

/** Daily numbers synced from your watch via Health Connect. */
export type HealthDay = {
  steps: number;
  sleepMinutes: number;
  /** When you fell asleep (ISO time), for the "Asleep by 23:00" habit */
  sleepStart?: string;
  avgHeartRate?: number;
  restingHeartRate?: number;
};

export type Settings = {
  /** Sync steps, sleep, heart rate and workouts from Health Connect (Android) */
  healthConnect: boolean;
  reminders: boolean;
  /** Hour of the day (0-23) for the "don't break your streak" reminder. */
  reminderHour: number;
  /** Size of one tap in the water tracker, in ml */
  bottleMl: number;
  /** Highest level you've already been congratulated for */
  seenLevel: number;
};

export type AppState = {
  /** null until onboarding is finished */
  profile: Profile | null;
  settings: Settings;
  goals: Goals;
  health: Record<DateKey, HealthDay>;
  /** Water drunk per day, in ml */
  water: Record<DateKey, number>;
  food: FoodEntry[];
  myFoods: MyFood[];
  /** Friend challenges you completed (for badges and XP) */
  challengeWins: { id: string; title: string; date: DateKey }[];
  workouts: Workout[];
  /** Manual habits ticked per day, e.g. { '2026-10-27': ['water', 'steps'] } */
  checks: Record<DateKey, HabitId[]>;
  /** Social feed post ids you liked */
  likes: string[];
};
