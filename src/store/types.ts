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
  /**
   * What the entry is based on, so the amount can be changed later:
   * unit 'g' = values per 100 g, unit 'serving' = values per 1 serving.
   */
  base?: { amount: number; unit: 'g' | 'serving'; kcal: number; protein: number; carbs: number; fat: number };
};

export type WorkoutType = 'gym' | 'run' | 'walk' | 'cycle' | 'swim' | 'other';

export type ExerciseSet = {
  reps: number;
  weight: number;
  /** Warm-up sets don't count for records */
  warmup?: boolean;
  /** Ticked off during a live workout */
  done?: boolean;
  /** Drop set or a set taken to failure (warm-ups use `warmup`) */
  kind?: 'drop' | 'failure';
  /** How hard it felt, 6 (easy) to 10 (nothing left) */
  rpe?: number;
};

export type Exercise = {
  name: string;
  sets: ExerciseSet[];
  /** Rest between sets for this exercise, in seconds (else the app default) */
  restSeconds?: number;
  note?: string;
  /** Exercises with the same letter are done back to back as a superset */
  superset?: string;
  /** Reps to aim for in every set (from a program) */
  targetReps?: number;
};

/** A personal record set during a workout. */
export type PersonalRecord = {
  exercise: string;
  /** '1rm' only appears in workouts saved by older versions */
  kind: 'weight' | 'reps' | 'volume' | '1rm';
  /** kg (or total kg for volume) */
  value: number;
  /** Reps of the record set */
  reps?: number;
};

/** A saved workout plan, e.g. "Push day". */
export type Routine = {
  id: string;
  name: string;
  exercises: { name: string; sets: number; restSeconds?: number }[];
  lastUsed?: DateKey;
};

/** A workout that is going on right now (survives closing the app). */
export type ActiveWorkout = {
  id: string;
  startedAt: string; // ISO time
  type: WorkoutType;
  title: string;
  exercises: Exercise[];
  routineId?: string;
  /** When the current rest ends (ISO time), if resting */
  restUntil?: string;
  restSeconds?: number;
  /** The scheduled "rest over" notification, so it can be cancelled */
  restNotificationId?: string;
  photoUri?: string;
  tagged?: { id: string; name: string }[];
  /** "programId:dayId" when started from a program */
  programDay?: string;
};

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'cardio'
  | 'full body';

export type CustomExercise = { name: string; muscle: MuscleGroup };

export type BodyWeightEntry = { date: DateKey; kg: number };

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
  /** From your watch, when the workout was recorded there too */
  avgHeartRate?: number;
  maxHeartRate?: number;
  kcal?: number;
  /** Records set in this workout */
  prs?: PersonalRecord[];
  /** Started from this routine */
  routineId?: string;
  /** GPS route of a tracked run, ride or walk: [latitude, longitude] points */
  route?: [number, number][];
  /** Seconds per full kilometre */
  splits?: number[];
  /** Day of a training program this workout was */
  programDay?: string;
  /** Who sees it in the feed. Workouts saved before this existed count as 'friends'. */
  shared?: 'friends' | 'public' | 'none';
  /** Caption for the feed post */
  caption?: string;
};

/** Body measurements in cm (body fat in %). */
export type Measurement = {
  date: DateKey;
  waist?: number;
  chest?: number;
  arms?: number;
  hips?: number;
  thighs?: number;
  bodyFat?: number;
};

/** A progress photo stored only on this phone. */
export type ProgressPhoto = { id: string; date: DateKey; uri: string; pose: 'front' | 'side' | 'back' };

/** Foods you eat together, logged in one tap. With servings > 1 it's a recipe: one log is one serving. */
export type SavedMeal = {
  id: string;
  name: string;
  servings: number;
  items: { name: string; kcal: number; protein: number; carbs: number; fat: number }[];
};

export type GroceryItem = { id: string; text: string; done: boolean };

/** The training program you follow, and which day is next. */
export type ActiveProgram = { id: string; startedAt: DateKey; nextDay: number };

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
  /** Training days per week you aim for */
  workoutsPerWeek: number;
  /** Extra calories (from carbs) on days you train */
  trainingDayKcal: number;
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
  /** Calories burned by moving (not counting your resting burn) */
  activeKcal?: number;
  /** Heart-rate variability during the night, in ms (higher = better recovered) */
  hrv?: number;
  /** Sleep stages last night, in minutes (when your watch reports them) */
  deepMinutes?: number;
  remMinutes?: number;
  lightMinutes?: number;
  /** Latest weight from a smart scale */
  weightKg?: number;
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
  /** Default rest between sets, in seconds */
  restSeconds: number;
  /** Which stats the weekly review shows */
  reviewStats: string[];
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
  routines: Routine[];
  activeWorkout: ActiveWorkout | null;
  customExercises: CustomExercise[];
  bodyWeight: BodyWeightEntry[];
  workouts: Workout[];
  /** Manual habits ticked per day, e.g. { '2026-10-27': ['water', 'steps'] } */
  checks: Record<DateKey, HabitId[]>;
  /** Social feed post ids you liked */
  likes: string[];
  measurements: Measurement[];
  progressPhotos: ProgressPhoto[];
  savedMeals: SavedMeal[];
  grocery: GroceryItem[];
  program: ActiveProgram | null;
  /** Notes per exercise, shown every time you do it */
  exerciseNotes: Record<string, string>;
  /** Your profile picture (copy of the one in your account), for the header */
  avatarUrl: string | null;
  /** The AI coach's latest advice */
  coachAdvice: CoachAdvice | null;
};

export type CoachAdvice = { week: DateKey; headline: string; wins: string[]; focus: { title: string; detail: string }[] };
