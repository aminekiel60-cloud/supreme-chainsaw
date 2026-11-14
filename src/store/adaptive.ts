/**
 * Adaptive calories: your real daily burn, worked out from what you ate and
 * how your weight moved (like MacroFactor). If you ate 2,500 a day and stayed
 * the same weight, you burn about 2,500. Every kg gained or lost is counted
 * as about 7,700 kcal.
 */
import { addDays, todayKey } from './dates';
import { dayTotals } from './logic';
import type { AppState } from './types';

const KCAL_PER_KG = 7700;
const WINDOW = 21;

export type Adaptive =
  | { ready: false; reason: string; daysLogged: number; weighIns: number }
  | {
      ready: true;
      burn: number;
      avgIntake: number;
      kgPerWeek: number;
      target: number;
      carbs: number;
      daysLogged: number;
      weighIns: number;
    };

/** Straight-line trend through the weigh-ins: kg per day. */
function slope(points: { x: number; y: number }[]) {
  const n = points.length;
  const mx = points.reduce((t, p) => t + p.x, 0) / n;
  const my = points.reduce((t, p) => t + p.y, 0) / n;
  const num = points.reduce((t, p) => t + (p.x - mx) * (p.y - my), 0);
  const den = points.reduce((t, p) => t + (p.x - mx) ** 2, 0);
  return den ? num / den : 0;
}

export function adaptiveCalories(state: AppState): Adaptive {
  const today = todayKey();
  const from = addDays(today, -WINDOW);
  const days = Array.from({ length: WINDOW }, (_, i) => addDays(from, i)); // up to yesterday: today isn't finished
  // Only days that look fully logged count.
  const logged = days.map((d) => dayTotals(state, d).kcal).filter((k) => k >= 800);
  const weights = state.bodyWeight.filter((b) => b.date >= from && b.date <= today);
  const daysLogged = logged.length;
  const weighIns = weights.length;
  if (daysLogged < 10) return { ready: false, reason: `Log your food on ${10 - daysLogged} more full days.`, daysLogged, weighIns };
  if (weighIns < 3) return { ready: false, reason: `Weigh yourself ${3 - weighIns} more ${3 - weighIns === 1 ? 'time' : 'times'} in the next weeks.`, daysLogged, weighIns };
  const span = (new Date(weights[weights.length - 1].date).getTime() - new Date(weights[0].date).getTime()) / 86400000;
  if (span < 10) return { ready: false, reason: 'Your weigh-ins need to cover at least 10 days.', daysLogged, weighIns };

  const t0 = new Date(weights[0].date).getTime();
  const perDay = slope(weights.map((w) => ({ x: (new Date(w.date).getTime() - t0) / 86400000, y: w.kg })));
  const avgIntake = logged.reduce((t, k) => t + k, 0) / logged.length;
  const burn = Math.round((avgIntake - perDay * KCAL_PER_KG) / 10) * 10;

  const goal = state.profile?.goal ?? 'maintain';
  const floor = state.profile?.sex === 'female' ? 1200 : 1500;
  const raw = goal === 'cut' ? burn * 0.8 : goal === 'bulk' ? burn + 250 : burn;
  const target = Math.max(floor, Math.round(raw / 10) * 10);
  const carbs = Math.max(50, Math.round((target - state.goals.protein * 4 - state.goals.fat * 9) / 4));
  return { ready: true, burn, avgIntake: Math.round(avgIntake), kgPerWeek: Math.round(perDay * 7 * 100) / 100, target, carbs, daysLogged, weighIns };
}

/** Worth suggesting: ready, and at least 75 kcal away from the current goal. */
export function adaptiveSuggestion(state: AppState) {
  const a = adaptiveCalories(state);
  if (!a.ready || Math.abs(a.target - state.goals.kcal) < 75) return null;
  return a;
}
