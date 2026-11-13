/**
 * Built-in exercise library. Users can add their own (stored in the app state).
 * Muscle groups power the "muscles trained this week" overview.
 */
import type { MuscleGroup } from '@/store/types';

export type LibraryExercise = {
  name: string;
  muscle: MuscleGroup;
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'other';
  /** True when the weight is the barbell + plates (for the plate calculator) */
  bar?: boolean;
};

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  cardio: 'Cardio',
  'full body': 'Full body',
};

export const MUSCLE_GROUPS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // Chest
  { name: 'Bench press', muscle: 'chest', equipment: 'barbell', bar: true },
  { name: 'Incline bench press', muscle: 'chest', equipment: 'barbell', bar: true },
  { name: 'Dumbbell bench press', muscle: 'chest', equipment: 'dumbbell' },
  { name: 'Incline dumbbell press', muscle: 'chest', equipment: 'dumbbell' },
  { name: 'Chest press machine', muscle: 'chest', equipment: 'machine' },
  { name: 'Cable fly', muscle: 'chest', equipment: 'cable' },
  { name: 'Pec deck', muscle: 'chest', equipment: 'machine' },
  { name: 'Push-up', muscle: 'chest', equipment: 'bodyweight' },
  { name: 'Dip', muscle: 'chest', equipment: 'bodyweight' },
  // Back
  { name: 'Deadlift', muscle: 'back', equipment: 'barbell', bar: true },
  { name: 'Barbell row', muscle: 'back', equipment: 'barbell', bar: true },
  { name: 'Pull-up', muscle: 'back', equipment: 'bodyweight' },
  { name: 'Chin-up', muscle: 'back', equipment: 'bodyweight' },
  { name: 'Lat pulldown', muscle: 'back', equipment: 'cable' },
  { name: 'Seated cable row', muscle: 'back', equipment: 'cable' },
  { name: 'Dumbbell row', muscle: 'back', equipment: 'dumbbell' },
  { name: 'T-bar row', muscle: 'back', equipment: 'barbell' },
  { name: 'Face pull', muscle: 'back', equipment: 'cable' },
  { name: 'Straight-arm pulldown', muscle: 'back', equipment: 'cable' },
  // Shoulders
  { name: 'Overhead press', muscle: 'shoulders', equipment: 'barbell', bar: true },
  { name: 'Dumbbell shoulder press', muscle: 'shoulders', equipment: 'dumbbell' },
  { name: 'Lateral raise', muscle: 'shoulders', equipment: 'dumbbell' },
  { name: 'Cable lateral raise', muscle: 'shoulders', equipment: 'cable' },
  { name: 'Front raise', muscle: 'shoulders', equipment: 'dumbbell' },
  { name: 'Rear delt fly', muscle: 'shoulders', equipment: 'dumbbell' },
  { name: 'Arnold press', muscle: 'shoulders', equipment: 'dumbbell' },
  { name: 'Upright row', muscle: 'shoulders', equipment: 'barbell' },
  { name: 'Shrug', muscle: 'shoulders', equipment: 'dumbbell' },
  // Biceps
  { name: 'Barbell curl', muscle: 'biceps', equipment: 'barbell' },
  { name: 'Dumbbell curl', muscle: 'biceps', equipment: 'dumbbell' },
  { name: 'Hammer curl', muscle: 'biceps', equipment: 'dumbbell' },
  { name: 'Incline dumbbell curl', muscle: 'biceps', equipment: 'dumbbell' },
  { name: 'Preacher curl', muscle: 'biceps', equipment: 'machine' },
  { name: 'Cable curl', muscle: 'biceps', equipment: 'cable' },
  // Triceps
  { name: 'Triceps pushdown', muscle: 'triceps', equipment: 'cable' },
  { name: 'Overhead triceps extension', muscle: 'triceps', equipment: 'cable' },
  { name: 'Skull crusher', muscle: 'triceps', equipment: 'barbell' },
  { name: 'Close-grip bench press', muscle: 'triceps', equipment: 'barbell', bar: true },
  { name: 'Triceps dip', muscle: 'triceps', equipment: 'bodyweight' },
  { name: 'Triceps kickback', muscle: 'triceps', equipment: 'dumbbell' },
  // Legs
  { name: 'Squat', muscle: 'quads', equipment: 'barbell', bar: true },
  { name: 'Front squat', muscle: 'quads', equipment: 'barbell', bar: true },
  { name: 'Leg press', muscle: 'quads', equipment: 'machine' },
  { name: 'Hack squat', muscle: 'quads', equipment: 'machine' },
  { name: 'Leg extension', muscle: 'quads', equipment: 'machine' },
  { name: 'Bulgarian split squat', muscle: 'quads', equipment: 'dumbbell' },
  { name: 'Lunge', muscle: 'quads', equipment: 'dumbbell' },
  { name: 'Goblet squat', muscle: 'quads', equipment: 'kettlebell' },
  { name: 'Romanian deadlift', muscle: 'hamstrings', equipment: 'barbell', bar: true },
  { name: 'Leg curl', muscle: 'hamstrings', equipment: 'machine' },
  { name: 'Stiff-leg deadlift', muscle: 'hamstrings', equipment: 'barbell', bar: true },
  { name: 'Good morning', muscle: 'hamstrings', equipment: 'barbell', bar: true },
  { name: 'Hip thrust', muscle: 'glutes', equipment: 'barbell', bar: true },
  { name: 'Glute bridge', muscle: 'glutes', equipment: 'bodyweight' },
  { name: 'Cable kickback', muscle: 'glutes', equipment: 'cable' },
  { name: 'Hip abduction', muscle: 'glutes', equipment: 'machine' },
  { name: 'Standing calf raise', muscle: 'calves', equipment: 'machine' },
  { name: 'Seated calf raise', muscle: 'calves', equipment: 'machine' },
  // Core
  { name: 'Plank', muscle: 'core', equipment: 'bodyweight' },
  { name: 'Crunch', muscle: 'core', equipment: 'bodyweight' },
  { name: 'Hanging leg raise', muscle: 'core', equipment: 'bodyweight' },
  { name: 'Cable crunch', muscle: 'core', equipment: 'cable' },
  { name: 'Russian twist', muscle: 'core', equipment: 'other' },
  { name: 'Ab wheel rollout', muscle: 'core', equipment: 'other' },
  // Full body / cardio
  { name: 'Clean and press', muscle: 'full body', equipment: 'barbell', bar: true },
  { name: 'Kettlebell swing', muscle: 'full body', equipment: 'kettlebell' },
  { name: 'Burpee', muscle: 'full body', equipment: 'bodyweight' },
  { name: 'Farmer’s walk', muscle: 'full body', equipment: 'dumbbell' },
  { name: 'Rowing machine', muscle: 'cardio', equipment: 'machine' },
  { name: 'Treadmill', muscle: 'cardio', equipment: 'machine' },
  { name: 'Stair climber', muscle: 'cardio', equipment: 'machine' },
  { name: 'Jump rope', muscle: 'cardio', equipment: 'other' },
];

const byName = new Map(EXERCISE_LIBRARY.map((e) => [e.name.toLowerCase(), e]));

export function libraryExercise(name: string): LibraryExercise | undefined {
  return byName.get(name.trim().toLowerCase());
}
