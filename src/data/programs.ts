/**
 * Built-in training programs. Each program is a list of days you repeat in
 * order. The app remembers which day is next and suggests the weights.
 */
export type ProgramExercise = {
  name: string;
  sets: number;
  /** Reps you aim for in every set */
  reps: number;
  restSeconds: number;
};

export type ProgramDay = { id: string; name: string; exercises: ProgramExercise[] };

export type Program = {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'All levels';
  daysPerWeek: number;
  goal: string;
  description: string;
  /** How weights go up */
  progression: string;
  /** kg added when every set hit the target reps: [upper body, lower body] */
  step: [number, number];
  days: ProgramDay[];
};

const ex = (name: string, sets: number, reps: number, restSeconds = 90): ProgramExercise => ({ name, sets, reps, restSeconds });

export const PROGRAMS: Program[] = [
  {
    id: 'starter',
    name: 'Gym starter',
    level: 'Beginner',
    daysPerWeek: 3,
    goal: 'Learn the basics',
    description: 'Machines and dumbbells only, so every exercise is easy to learn and safe to push. Two full-body days you alternate.',
    progression: 'When you hit 12 reps in every set, the app suggests the next weight up.',
    step: [2.5, 5],
    days: [
      {
        id: 'A',
        name: 'Full body A',
        exercises: [ex('Leg press', 3, 12), ex('Chest press machine', 3, 12), ex('Lat pulldown', 3, 12), ex('Dumbbell shoulder press', 2, 12), ex('Leg curl', 2, 12), ex('Russian twist', 3, 20, 60)],
      },
      {
        id: 'B',
        name: 'Full body B',
        exercises: [ex('Goblet squat', 3, 12), ex('Dumbbell bench press', 3, 12), ex('Seated cable row', 3, 12), ex('Lateral raise', 2, 15, 60), ex('Hip thrust', 2, 12), ex('Crunch', 3, 15, 60)],
      },
    ],
  },
  {
    id: 'stronglifts',
    name: '5×5 Strength',
    level: 'Beginner',
    daysPerWeek: 3,
    goal: 'Get strong fast',
    description: 'Five heavy sets of five on the big barbell lifts. Two short workouts you alternate, three times a week.',
    progression: 'Did all 5×5? Add 2.5 kg next time (5 kg on squat and deadlift).',
    step: [2.5, 5],
    days: [
      { id: 'A', name: 'Workout A', exercises: [ex('Squat', 5, 5, 180), ex('Bench press', 5, 5, 180), ex('Barbell row', 5, 5, 180)] },
      { id: 'B', name: 'Workout B', exercises: [ex('Squat', 5, 5, 180), ex('Overhead press', 5, 5, 180), ex('Deadlift', 1, 5, 180)] },
    ],
  },
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    level: 'Intermediate',
    daysPerWeek: 6,
    goal: 'Build muscle',
    description: 'The classic gym split. Push muscles, pull muscles and legs each get their own day. Run it 3 or 6 days a week.',
    progression: 'Hit the top of the rep range in every set and the app suggests more weight.',
    step: [2.5, 5],
    days: [
      {
        id: 'push',
        name: 'Push',
        exercises: [ex('Bench press', 4, 8, 150), ex('Overhead press', 3, 8, 120), ex('Incline dumbbell press', 3, 10), ex('Lateral raise', 4, 15, 60), ex('Triceps pushdown', 3, 12, 60), ex('Overhead triceps extension', 2, 12, 60)],
      },
      {
        id: 'pull',
        name: 'Pull',
        exercises: [ex('Deadlift', 3, 5, 180), ex('Pull-up', 3, 8, 120), ex('Barbell row', 3, 10), ex('Face pull', 3, 15, 60), ex('Barbell curl', 3, 10, 60), ex('Hammer curl', 2, 12, 60)],
      },
      {
        id: 'legs',
        name: 'Legs',
        exercises: [ex('Squat', 4, 8, 180), ex('Romanian deadlift', 3, 10, 120), ex('Leg press', 3, 12), ex('Leg curl', 3, 12, 60), ex('Standing calf raise', 4, 15, 60), ex('Hanging leg raise', 3, 12, 60)],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper Lower',
    level: 'Intermediate',
    daysPerWeek: 4,
    goal: 'Strength and size',
    description: 'Four days a week: two upper body days and two leg days. Every muscle twice a week with time to recover.',
    progression: 'All sets at the target reps means the next weight up next time.',
    step: [2.5, 5],
    days: [
      {
        id: 'upper-a',
        name: 'Upper A',
        exercises: [ex('Bench press', 4, 6, 150), ex('Barbell row', 4, 8, 120), ex('Dumbbell shoulder press', 3, 10), ex('Lat pulldown', 3, 10), ex('Barbell curl', 2, 12, 60), ex('Skull crusher', 2, 12, 60)],
      },
      {
        id: 'lower-a',
        name: 'Lower A',
        exercises: [ex('Squat', 4, 6, 180), ex('Romanian deadlift', 3, 8, 120), ex('Bulgarian split squat', 3, 10), ex('Leg curl', 3, 12, 60), ex('Seated calf raise', 4, 15, 60)],
      },
      {
        id: 'upper-b',
        name: 'Upper B',
        exercises: [ex('Overhead press', 4, 6, 150), ex('Pull-up', 4, 8, 120), ex('Incline dumbbell press', 3, 10), ex('Seated cable row', 3, 10), ex('Lateral raise', 3, 15, 60), ex('Hammer curl', 2, 12, 60)],
      },
      {
        id: 'lower-b',
        name: 'Lower B',
        exercises: [ex('Deadlift', 3, 5, 180), ex('Front squat', 3, 8, 150), ex('Hip thrust', 3, 10), ex('Leg extension', 3, 12, 60), ex('Standing calf raise', 4, 12, 60), ex('Ab wheel rollout', 3, 10, 60)],
      },
    ],
  },
  {
    id: 'home',
    name: 'Home, no equipment',
    level: 'All levels',
    daysPerWeek: 3,
    goal: 'Train anywhere',
    description: 'Bodyweight only. Do it in your room, a park or a hotel. Short rests keep your heart rate up.',
    progression: 'Add reps every week. When a set gets easy, slow the lowering part down to 3 seconds.',
    step: [0, 0],
    days: [
      {
        id: 'A',
        name: 'Home A',
        exercises: [ex('Push-up', 4, 12, 60), ex('Lunge', 3, 12, 60), ex('Glute bridge', 3, 15, 45), ex('Crunch', 3, 20, 45), ex('Burpee', 3, 10, 60)],
      },
      {
        id: 'B',
        name: 'Home B',
        exercises: [ex('Bulgarian split squat', 3, 10, 60), ex('Dip', 3, 10, 60), ex('Russian twist', 3, 20, 45), ex('Push-up', 3, 15, 60), ex('Hanging leg raise', 3, 10, 60)],
      },
    ],
  },
];

export const program = (id: string | undefined) => PROGRAMS.find((p) => p.id === id);
