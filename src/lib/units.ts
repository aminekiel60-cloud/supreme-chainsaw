/**
 * kg or lbs. Everything is stored in kg; this only changes what you see and type.
 */
import { useStore } from '@/store/store';
import type { ExerciseSet } from '@/store/types';

export type Unit = 'kg' | 'lb';
const LB = 2.20462;

/** Round to what a gym can load: 0.25 kg or 0.5 lb. */
export function fromKg(kg: number, unit: Unit) {
  return unit === 'lb' ? Math.round(kg * LB * 2) / 2 : Math.round(kg * 4) / 4;
}

export function toKg(value: number, unit: Unit) {
  return unit === 'lb' ? Math.round((value / LB) * 1000) / 1000 : value;
}

export function weightText(kg: number, unit: Unit) {
  return `${fromKg(kg, unit).toLocaleString('en-US')} ${unit}`;
}

/** "1:30" for timed sets. */
export function secondsText(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
}

/** One set as text, e.g. "60×8", "+10 kg × 8", "1:30", "40 m". */
export function setText(set: ExerciseSet, unit: Unit) {
  if (set.seconds) return set.weight ? `${secondsText(set.seconds)} at ${fromKg(set.weight, unit)}` : secondsText(set.seconds);
  if (set.meters) return set.weight ? `${set.meters} m, ${fromKg(set.weight, unit)} ${unit}` : `${set.meters} m`;
  return `${fromKg(set.weight, unit)}×${set.reps}`;
}

export function useUnits() {
  const { state } = useStore();
  const unit: Unit = state.settings.units ?? 'kg';
  return {
    unit,
    show: (kg: number) => fromKg(kg, unit),
    text: (kg: number) => weightText(kg, unit),
    toKg: (v: number) => toKg(v, unit),
    /** The usual jump between weights */
    step: unit === 'lb' ? 5 : 2.5,
    set: (s: ExerciseSet) => setText(s, unit),
  };
}
