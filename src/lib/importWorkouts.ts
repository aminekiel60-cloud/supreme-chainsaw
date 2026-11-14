/**
 * Import workout history from the CSV export of Strong or Hevy.
 * Exercise names are matched to the Locked in library where possible
 * ("Bench Press (Barbell)" becomes "Bench press"); others stay as your own exercises.
 */
import { ALIASES, EXERCISE_LIBRARY } from '@/data/exercises';
import { closestExercise } from '@/store/exercises';
import type { Exercise, ExerciseSet, Workout } from '@/store/types';

export type ImportSource = 'strong' | 'hevy';
export type ImportResult = { source: ImportSource; workouts: Workout[]; matched: number; ownNames: string[] };

/** Split CSV text into rows, respecting quotes. Works with , and ; separators. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const bySquash = new Map(EXERCISE_LIBRARY.map((e) => [squash(e.name), e.name]));

/** Names Strong and Hevy use that don't follow a simple rule. */
const SPECIAL: Record<string, string> = {
  'benchpressdumbbell': 'Dumbbell bench press',
  'inclinebenchpressdumbbell': 'Incline dumbbell press',
  'bicepcurlbarbell': 'Barbell curl',
  'bicepcurldumbbell': 'Dumbbell curl',
  'bicepcurlcable': 'Cable curl',
  'hammercurldumbbell': 'Hammer curl',
  'bentoverrowbarbell': 'Barbell row',
  'bentoverrowdumbbell': 'Dumbbell row',
  'shoulderpressdumbbell': 'Dumbbell shoulder press',
  'overheadpressbarbell': 'Overhead press',
  'seatedrowcable': 'Seated cable row',
  'chestflydumbbell': 'Cable fly',
  'legpressmachine': 'Leg press',
  'legextensionmachine': 'Leg extension',
  'seatedlegcurlmachine': 'Leg curl',
  'lyinglegcurlmachine': 'Leg curl',
  'calfraisestanding': 'Standing calf raise',
  'standingcalfraisemachine': 'Standing calf raise',
  'seatedcalfraisemachine': 'Seated calf raise',
  'triceppushdowncable': 'Triceps pushdown',
  'tricepspushdowncablestraightbar': 'Triceps pushdown',
  'tricepsropepushdown': 'Triceps pushdown',
  'facepullcable': 'Face pull',
  'running': 'Treadmill',
};

function sentence(name: string) {
  const n = name.trim().replace(/\s+/g, ' ');
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}

/** The library name for an exercise from another app, or a cleaned-up version of its own name. */
export function matchExercise(raw: string): { name: string; matched: boolean } {
  const base = raw.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const equip = (raw.match(/\(([^)]*)\)/)?.[1] ?? '').toLowerCase().split(/[\s-]/)[0];
  const tries = [SPECIAL[squash(raw)], raw, base, equip && `${equip} ${base}`, ALIASES[base.toLowerCase()], base.replace(/^(seated|lying|standing) /i, '')];
  for (const t of tries) {
    if (!t) continue;
    const hit = bySquash.get(squash(t));
    if (hit) return { name: hit, matched: true };
  }
  const close = closestExercise(base);
  if (close) return { name: close, matched: true };
  return { name: sentence(raw), matched: false };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "2024-01-15 18:30:00" (Strong) or "16 Nov 2024, 18:03" (Hevy) to a Date. */
function parseDate(text: string): Date | null {
  const t = text.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5]);
  const hevy = t.match(/^(\d{1,2}) (\w{3})\w* (\d{4}),? (\d{1,2}):(\d{2})/);
  if (hevy) {
    const m = MONTHS.indexOf(hevy[2].toLowerCase());
    if (m >= 0) return new Date(+hevy[3], m, +hevy[1], +hevy[4], +hevy[5]);
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "1h 5m", "45m", "1h" (Strong) to minutes. */
function parseDuration(text: string): number {
  const h = Number(text.match(/(\d+)\s*h/)?.[1] ?? 0);
  const m = Number(text.match(/(\d+)\s*m/)?.[1] ?? 0);
  const s = Number(text.match(/(\d+)\s*s/)?.[1] ?? 0);
  return h * 60 + m + Math.round(s / 60);
}

const num = (v: string | undefined) => {
  const n = Number((v ?? '').replace(',', '.'));
  return isFinite(n) ? n : 0;
};

/**
 * Read a Strong or Hevy CSV. `weightsInLbs` is used when the file doesn't
 * say which unit its weights are in (older Strong exports).
 */
export function readExport(text: string, weightsInLbs: boolean): ImportResult {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (rows.length < 2) throw new Error('This file is empty.');
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const hevy = col('exercise_title') >= 0;
  const strong = col('exercise name') >= 0;
  if (!hevy && !strong) throw new Error('This is not a Strong or Hevy export. Export your workouts as CSV in that app and try again.');

  const c = hevy
    ? {
        title: col('title'),
        start: col('start_time'),
        end: col('end_time'),
        exercise: col('exercise_title'),
        type: col('set_type'),
        kg: col('weight_kg'),
        lb: col('weight_lbs'),
        reps: col('reps'),
        km: col('distance_km'),
        miles: col('distance_miles'),
        seconds: col('duration_seconds'),
        rpe: col('rpe'),
        notes: col('exercise_notes'),
      }
    : {
        title: col('workout name'),
        start: col('date'),
        duration: col('duration'),
        exercise: col('exercise name'),
        order: col('set order'),
        weight: col('weight', 'weight (kg)', 'weight (lbs)'),
        reps: col('reps'),
        distance: col('distance'),
        seconds: col('seconds'),
        rpe: col('rpe'),
      };
  const strongLbs = !hevy && (head.includes('weight (lbs)') || (!head.includes('weight (kg)') && weightsInLbs));

  const groups = new Map<string, { date: Date; title: string; minutes: number; exercises: Map<string, Exercise> }>();
  const names = new Map<string, { name: string; matched: boolean }>();
  for (const r of rows.slice(1)) {
    const when = parseDate(r[c.start] ?? '');
    const rawName = (r[c.exercise] ?? '').trim();
    if (!when || !rawName) continue;
    const title = (r[c.title] ?? '').trim() || 'Workout';
    const key = `${r[c.start]}|${title}`;
    let g = groups.get(key);
    if (!g) {
      let minutes = 0;
      if ('duration' in c && c.duration !== undefined && c.duration >= 0) minutes = parseDuration(r[c.duration] ?? '');
      if ('end' in c && c.end !== undefined && c.end >= 0) {
        const end = parseDate(r[c.end] ?? '');
        if (end) minutes = Math.max(1, Math.round((end.getTime() - when.getTime()) / 60000));
      }
      g = { date: when, title, minutes, exercises: new Map() };
      groups.set(key, g);
    }
    if (!names.has(rawName)) names.set(rawName, matchExercise(rawName));
    const name = names.get(rawName)!.name;
    const ex = g.exercises.get(name) ?? { name, sets: [] };
    g.exercises.set(name, ex);

    // One set
    let weight = 0;
    let warmup = false;
    let kind: ExerciseSet['kind'];
    if (hevy) {
      weight = c.kg! >= 0 && r[c.kg!] !== '' ? num(r[c.kg!]) : c.lb! >= 0 ? num(r[c.lb!]) / 2.20462 : 0;
      const type = (r[c.type!] ?? '').toLowerCase();
      warmup = type === 'warmup';
      kind = type === 'dropset' ? 'drop' : type === 'failure' ? 'failure' : undefined;
    } else {
      weight = num(r[c.weight!]) / (strongLbs ? 2.20462 : 1);
      const order = (r[c.order!] ?? '').trim().toUpperCase();
      if (order && !/^\d+$/.test(order) && !['W', 'D', 'F'].includes(order)) continue; // e.g. rest timer rows
      warmup = order === 'W';
      kind = order === 'D' ? 'drop' : order === 'F' ? 'failure' : undefined;
    }
    const reps = Math.round(num(r[c.reps]));
    const seconds = Math.round(num(r[c.seconds]));
    const km = hevy ? (c.km! >= 0 ? num(r[c.km!]) : num(r[c.miles!]) * 1.609) : num(r[(c as { distance: number }).distance]);
    const rpe = num(r[c.rpe]);
    if (!reps && !seconds && !km) continue;
    const set: ExerciseSet = { weight: Math.round(weight * 100) / 100, reps };
    if (warmup) set.warmup = true;
    if (kind) set.kind = kind;
    if (seconds && !reps) set.seconds = seconds;
    if (km && !reps) set.meters = Math.round(km * 1000);
    if (rpe >= 6 && rpe <= 10) set.rpe = rpe;
    ex.sets.push(set);
  }

  const workouts: Workout[] = [...groups.values()]
    .filter((g) => g.exercises.size > 0)
    .map((g) => {
      const date = dateKey(g.date);
      return {
        id: `import-${squash(date + g.title + g.date.getHours() + g.date.getMinutes())}`,
        date,
        type: 'gym' as const,
        title: g.title,
        durationMin: g.minutes || Math.max(20, [...g.exercises.values()].reduce((t, e) => t + e.sets.length, 0) * 3),
        exercises: [...g.exercises.values()].filter((e) => e.sets.length > 0),
        externalId: `import:${date}:${squash(g.title)}:${g.date.getHours()}${g.date.getMinutes()}`,
        shared: 'none' as const,
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const all = [...names.values()];
  return {
    source: hevy ? 'hevy' : 'strong',
    workouts,
    matched: all.filter((n) => n.matched).length,
    ownNames: [...new Set(all.filter((n) => !n.matched).map((n) => n.name))],
  };
}
