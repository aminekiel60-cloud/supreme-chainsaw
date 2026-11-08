/**
 * Health Connect (Android) — reads steps, sleep, heart rate and workouts
 * that your watch app (Garmin Connect, Samsung Health, Fitbit, …) writes there.
 *
 * Synced data per day:
 * - steps: total steps that day (auto-ticks the 10,000 steps habit)
 * - sleepMinutes: the night that ENDED that morning ("sleep last night")
 * - sleepStart: when you fell asleep on the EVENING of that day (for "Asleep by 23:00")
 * - heart rate: average and resting heart rate that day
 * Workouts (exercise sessions) are imported once into your training log.
 */
import { useEffect } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import {
  ExerciseType,
  SdkAvailabilityStatus,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';

import { addDays, fromKey, todayKey } from '@/store/dates';
import type { DateKey, HealthDay, Workout, WorkoutType } from '@/store/types';

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Distance' },
] as const;

export { openHealthConnectSettings };

/** Is Health Connect installed and usable on this phone? */
export async function healthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

/** Ask for permission. Returns true when at least steps can be read. */
export async function connectHealth(): Promise<boolean> {
  if (!(await healthAvailable())) return false;
  await initialize();
  const granted = await requestPermission([...PERMISSIONS]);
  return granted.some((p) => 'recordType' in p && p.recordType === 'Steps');
}

async function canRead(recordType: string) {
  const granted = await getGrantedPermissions();
  return granted.some((p) => 'recordType' in p && p.recordType === recordType && p.accessType === 'read');
}

const between = (start: Date, end: Date) => ({
  operator: 'between' as const,
  startTime: start.toISOString(),
  endTime: end.toISOString(),
});

function workoutType(exerciseType: number): WorkoutType {
  if (exerciseType === ExerciseType.RUNNING || exerciseType === ExerciseType.RUNNING_TREADMILL) return 'run';
  if (exerciseType === ExerciseType.STRENGTH_TRAINING || exerciseType === ExerciseType.WEIGHTLIFTING) return 'gym';
  return 'other';
}

const TITLES: Record<WorkoutType, string> = { run: 'Run', gym: 'Gym session', other: 'Workout' };

/** Read one day's numbers and that day's workouts. */
async function readDay(date: DateKey): Promise<{ day: HealthDay; workouts: Omit<Workout, 'id'>[] }> {
  const start = fromKey(date);
  const end = fromKey(addDays(date, 1));
  const now = new Date();
  const dayRange = between(start, end < now ? end : now);
  const day: HealthDay = { steps: 0, sleepMinutes: 0 };

  if (await canRead('Steps')) {
    day.steps = (await aggregateRecord({ recordType: 'Steps', timeRangeFilter: dayRange })).COUNT_TOTAL ?? 0;
  }

  if (await canRead('SleepSession')) {
    // Last night: sessions that ended between 00:00 and 14:00 today.
    const morning = new Date(start);
    morning.setHours(14);
    const lastNight = await readRecords('SleepSession', {
      timeRangeFilter: between(new Date(start.getTime() - 12 * 3600e3), morning < now ? morning : now),
    });
    day.sleepMinutes = Math.round(
      lastNight.records
        .filter((r) => new Date(r.endTime) >= start)
        .reduce((t, r) => t + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000, 0),
    );
    // Tonight: the first session that started between 18:00 today and 06:00 tomorrow.
    const evening = new Date(start);
    evening.setHours(18);
    if (evening < now) {
      const tonight = await readRecords('SleepSession', {
        timeRangeFilter: between(evening, new Date(Math.min(end.getTime() + 6 * 3600e3, now.getTime()))),
      });
      const first = tonight.records.map((r) => r.startTime).sort()[0];
      if (first && new Date(first) >= evening) day.sleepStart = first;
    }
  }

  if (await canRead('HeartRate')) {
    const hr = await aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: dayRange });
    if (hr.MEASUREMENTS_COUNT > 0) day.avgHeartRate = Math.round(hr.BPM_AVG);
  }
  if (await canRead('RestingHeartRate')) {
    const rhr = await aggregateRecord({ recordType: 'RestingHeartRate', timeRangeFilter: dayRange });
    if (rhr.BPM_AVG > 0) day.restingHeartRate = Math.round(rhr.BPM_AVG);
  }

  const workouts: Omit<Workout, 'id'>[] = [];
  if (await canRead('ExerciseSession')) {
    const sessions = await readRecords('ExerciseSession', { timeRangeFilter: dayRange });
    for (const s of sessions.records) {
      const type = workoutType(s.exerciseType);
      const sStart = new Date(s.startTime);
      const sEnd = new Date(s.endTime);
      let distanceKm: number | undefined;
      if (type !== 'gym' && (await canRead('Distance'))) {
        const d = await aggregateRecord({ recordType: 'Distance', timeRangeFilter: between(sStart, sEnd) });
        const km = Math.round(d.DISTANCE.inKilometers * 100) / 100;
        if (km > 0) distanceKm = km;
      }
      workouts.push({
        date,
        type,
        title: s.title || TITLES[type],
        durationMin: Math.max(1, Math.round((sEnd.getTime() - sStart.getTime()) / 60000)),
        distanceKm,
        externalId: s.metadata?.id,
      });
    }
  }

  return { day, workouts };
}

type SyncDispatch = (a: { type: 'syncHealth'; date: DateKey; day: HealthDay; workouts: Omit<Workout, 'id'>[] }) => void;

/** Sync yesterday and today (yesterday's "asleep by 23:00" only becomes known this morning). */
export async function syncHealth(dispatch: SyncDispatch) {
  if (!(await healthAvailable())) return;
  await initialize();
  const today = todayKey();
  for (const date of [addDays(today, -1), today]) {
    const { day, workouts } = await readDay(date);
    dispatch({ type: 'syncHealth', date, day, workouts });
  }
}

/** Syncs when the app starts and every time it comes back to the foreground. */
export function useHealthSync(enabled: boolean, dispatch: SyncDispatch) {
  useEffect(() => {
    if (!enabled) return;
    const run = () => syncHealth(dispatch).catch(() => {});
    run();
    const sub = RNAppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [enabled, dispatch]);
}
