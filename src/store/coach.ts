/**
 * Weekly coach: plain tips worked out from your own log (no internet needed),
 * and the week's numbers that the AI coach gets to write its advice.
 */
import { MUSCLE_LABELS } from '@/data/exercises';
import { addDays, todayKey } from './dates';
import { muscleSetsThisWeek } from './exercises';
import { dayTotals, goalsFor, habitDone, isLockedIn, readiness } from './logic';
import type { AppState, MuscleGroup } from './types';

export type Tip = { icon: 'barbell' | 'nutrition' | 'moon' | 'water' | 'trending-up' | 'flame' | 'body' | 'checkmark-circle'; title: string; detail: string; good: boolean };

function lastDays(n: number) {
  const today = todayKey();
  return Array.from({ length: n }, (_, i) => addDays(today, -i));
}

export function coachTips(state: AppState): Tip[] {
  const days = lastDays(7);
  const tips: Tip[] = [];
  const workouts = state.workouts.filter((w) => w.date >= days[6]);
  const goal = state.goals.workoutsPerWeek;

  // Training
  if (workouts.length >= goal) {
    tips.push({ icon: 'checkmark-circle', title: `${workouts.length} workouts this week`, detail: `You hit your goal of ${goal}. Keep one easy day to recover.`, good: true });
  } else {
    const left = goal - workouts.length;
    tips.push({
      icon: 'barbell',
      title: `${workouts.length} of ${goal} workouts`,
      detail: left === 1 ? 'One more session reaches your weekly goal.' : `${left} more sessions reach your weekly goal. Plan them in your calendar now.`,
      good: false,
    });
  }

  // Muscle balance: big groups with no sets
  const sets = muscleSetsThisWeek(state);
  const big: MuscleGroup[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'];
  const gymWeek = workouts.some((w) => w.exercises?.length);
  const missed = big.filter((m) => sets[m] === 0);
  if (gymWeek && missed.length > 0 && missed.length < big.length) {
    tips.push({
      icon: 'body',
      title: `No ${missed.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(', ')} yet`,
      detail: 'Add a few sets for these so your body grows evenly. Ten to twenty sets a week per muscle is a good target.',
      good: false,
    });
  }

  // Protein
  const logged = days.filter((d) => dayTotals(state, d).kcal > 0);
  const proteinDays = days.filter((d) => habitDone(state, d, 'protein')).length;
  if (logged.length >= 3) {
    if (proteinDays >= 5) tips.push({ icon: 'nutrition', title: `Protein on ${proteinDays} of 7 days`, detail: 'Great. Protein is what turns training into muscle.', good: true });
    else {
      const avg = Math.round(logged.reduce((t, d) => t + dayTotals(state, d).protein, 0) / logged.length);
      tips.push({
        icon: 'nutrition',
        title: `Protein: ${avg} g a day on average`,
        detail: `Your goal is ${state.goals.protein} g. Easy wins: Greek yoghurt or skyr, eggs, a protein shake, or a bigger portion of chicken.`,
        good: false,
      });
    }
    const over = logged.filter((d) => dayTotals(state, d).kcal > goalsFor(state, d).kcal * 1.1).length;
    if (over >= 3 && state.profile?.goal === 'cut') {
      tips.push({ icon: 'flame', title: `Over your calories on ${over} days`, detail: 'To lose fat, aim to stay under on most days. Log before you eat, not after.', good: false });
    }
  } else {
    tips.push({ icon: 'nutrition', title: 'Log your food on more days', detail: 'With three or more days logged, the coach can tell you where your calories and protein stand.', good: false });
  }

  // Sleep
  const slept = days.map((d) => state.health[d]?.sleepMinutes ?? 0).filter((m) => m > 0);
  if (slept.length >= 3) {
    const avg = slept.reduce((t, m) => t + m, 0) / slept.length;
    const h = Math.floor(avg / 60);
    const m = Math.round(avg % 60);
    tips.push(
      avg >= 420
        ? { icon: 'moon', title: `${h}h ${m}m sleep a night`, detail: 'Enough sleep is when you recover and get stronger. Keep it up.', good: true }
        : { icon: 'moon', title: `${h}h ${m}m sleep a night`, detail: 'Aim for 7 hours or more. Go to bed 30 minutes earlier and put your phone away.', good: false },
    );
  }

  // Readiness
  const ready = readiness(state);
  if (ready && ready.score < 50) tips.push({ icon: 'trending-up', title: `Readiness ${ready.score}`, detail: 'Your body asks for an easier day. A walk or light session is the smart choice today.', good: false });

  // Locked-in days
  const locked = days.filter((d) => isLockedIn(state, d)).length;
  if (locked >= 5) tips.push({ icon: 'flame', title: `Locked in ${locked} of 7 days`, detail: 'That is a serious streak. This is how results happen.', good: true });

  return tips;
}

/** The week in numbers, for the AI coach. Only totals, no names or photos. */
export function coachPayload(state: AppState) {
  const days = lastDays(7);
  const workouts = state.workouts.filter((w) => w.date >= days[6]);
  const logged = days.filter((d) => dayTotals(state, d).kcal > 0);
  const avg = (f: (d: string) => number) => (logged.length ? Math.round(logged.reduce((t, d) => t + f(d), 0) / logged.length) : null);
  const slept = days.map((d) => state.health[d]?.sleepMinutes ?? 0).filter((m) => m > 0);
  const weights = state.bodyWeight.filter((b) => b.date >= addDays(todayKey(), -28));
  return {
    goal: state.profile?.goal ?? 'maintain',
    sex: state.profile?.sex,
    age: state.profile?.age,
    workoutsGoal: state.goals.workoutsPerWeek,
    workouts: workouts.map((w) => ({
      type: w.type,
      minutes: w.durationMin,
      km: w.distanceKm,
      exercises: w.exercises?.map((e) => ({ name: e.name, sets: e.sets.filter((s) => !s.warmup).map((s) => `${s.weight}x${s.reps}`) })),
      prs: w.prs?.length ?? 0,
    })),
    muscleSets: muscleSetsThisWeek(state),
    nutrition: {
      daysLogged: logged.length,
      kcalGoal: state.goals.kcal,
      proteinGoal: state.goals.protein,
      avgKcal: avg((d) => dayTotals(state, d).kcal),
      avgProtein: avg((d) => dayTotals(state, d).protein),
    },
    avgSleepMinutes: slept.length ? Math.round(slept.reduce((t, m) => t + m, 0) / slept.length) : null,
    restingHeartRate: state.health[todayKey()]?.restingHeartRate ?? null,
    readiness: readiness(state)?.score ?? null,
    lockedInDays: days.filter((d) => isLockedIn(state, d)).length,
    bodyWeightLast4Weeks: weights.map((b) => b.kg),
  };
}
