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
  SleepStageType,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';

import { addDays, fromKey, todayKey } from '@/store/dates';
import { sport } from '@/store/logic';
import type { DateKey, HealthDay, Workout, WorkoutType } from '@/store/types';

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'Weight' },
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

/** The record types you allowed Locked in to read. */
async function grantedTypes(): Promise<Set<string>> {
  const granted = await getGrantedPermissions();
  return new Set(granted.filter((p) => 'recordType' in p && p.accessType === 'read').map((p) => ('recordType' in p ? p.recordType : '')));
}

/** Run one reading; a single failing data type never stops the rest of the sync. */
async function attempt(read: () => Promise<void>) {
  try {
    await read();
  } catch {
    // e.g. the watch app hasn't written this type, or permission was just revoked
  }
}

const between = (start: Date, end: Date) => ({
  operator: 'between' as const,
  startTime: start.toISOString(),
  endTime: end.toISOString(),
});

function workoutType(exerciseType: number): WorkoutType {
  switch (exerciseType) {
    case ExerciseType.RUNNING:
    case ExerciseType.RUNNING_TREADMILL:
      return 'run';
    case ExerciseType.WALKING:
    case ExerciseType.HIKING:
      return 'walk';
    case ExerciseType.BIKING:
    case ExerciseType.BIKING_STATIONARY:
      return 'cycle';
    case ExerciseType.SWIMMING_POOL:
    case ExerciseType.SWIMMING_OPEN_WATER:
      return 'swim';
    case ExerciseType.STRENGTH_TRAINING:
    case ExerciseType.WEIGHTLIFTING:
      return 'gym';
    default:
      return 'other';
  }
}

/** Read one day's numbers and that day's workouts. */
async function readDay(date: DateKey, can: Set<string>): Promise<{ day: HealthDay; workouts: Omit<Workout, 'id'>[] }> {
  const start = fromKey(date);
  const end = fromKey(addDays(date, 1));
  const now = new Date();
  const dayRange = between(start, end < now ? end : now);
  const day: HealthDay = { steps: 0, sleepMinutes: 0 };
  const minutes = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000;

  if (can.has('Steps')) {
    await attempt(async () => {
      day.steps = (await aggregateRecord({ recordType: 'Steps', timeRangeFilter: dayRange })).COUNT_TOTAL ?? 0;
    });
  }

  if (can.has('SleepSession')) {
    await attempt(async () => {
      // Last night: sessions that ended between 00:00 and 14:00 today.
      const morning = new Date(start);
      morning.setHours(14);
      const nightStart = new Date(start.getTime() - 12 * 3600e3);
      const nightEnd = morning < now ? morning : now;
      const lastNight = await readRecords('SleepSession', { timeRangeFilter: between(nightStart, nightEnd) });
      const sessions = lastNight.records.filter((r) => new Date(r.endTime) >= start);
      day.sleepMinutes = Math.round(sessions.reduce((t, r) => t + minutes(r.startTime, r.endTime), 0));
      const stage = (type: number) =>
        Math.round(sessions.reduce((t, r) => t + (r.stages ?? []).filter((x) => x.stage === type).reduce((m, x) => m + minutes(x.startTime, x.endTime), 0), 0));
      if (sessions.some((r) => r.stages?.length)) {
        day.deepMinutes = stage(SleepStageType.DEEP);
        day.remMinutes = stage(SleepStageType.REM);
        day.lightMinutes = stage(SleepStageType.LIGHT);
        // Time awake in bed doesn't count as sleep.
        day.sleepMinutes = Math.max(0, day.sleepMinutes - stage(SleepStageType.AWAKE) - stage(SleepStageType.OUT_OF_BED));
      }
      // HRV measured during that night.
      if (can.has('HeartRateVariabilityRmssd') && sessions.length > 0) {
        const hrv = await readRecords('HeartRateVariabilityRmssd', { timeRangeFilter: between(nightStart, nightEnd) });
        if (hrv.records.length > 0) {
          day.hrv = Math.round(hrv.records.reduce((t, r) => t + r.heartRateVariabilityMillis, 0) / hrv.records.length);
        }
      }
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
    });
  }

  if (can.has('HeartRate')) {
    await attempt(async () => {
      const hr = await aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: dayRange });
      if (hr.MEASUREMENTS_COUNT > 0) day.avgHeartRate = Math.round(hr.BPM_AVG);
    });
  }
  if (can.has('RestingHeartRate')) {
    await attempt(async () => {
      const rhr = await aggregateRecord({ recordType: 'RestingHeartRate', timeRangeFilter: dayRange });
      if (rhr.BPM_AVG > 0) day.restingHeartRate = Math.round(rhr.BPM_AVG);
    });
  }
  if (can.has('ActiveCaloriesBurned')) {
    await attempt(async () => {
      const kcal = (await aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: dayRange })).ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0;
      if (kcal > 0) day.activeKcal = Math.round(kcal);
    });
  }
  if (can.has('Weight')) {
    await attempt(async () => {
      const weights = await readRecords('Weight', { timeRangeFilter: dayRange });
      const latest = weights.records.sort((x, y) => (x.time < y.time ? 1 : -1))[0];
      if (latest) day.weightKg = Math.round(latest.weight.inKilograms * 10) / 10;
    });
  }

  const workouts: Omit<Workout, 'id'>[] = [];
  if (can.has('ExerciseSession')) {
    await attempt(async () => {
      const sessions = await readRecords('ExerciseSession', { timeRangeFilter: dayRange });
      for (const s of sessions.records) {
        const type = workoutType(s.exerciseType);
        const range = between(new Date(s.startTime), new Date(s.endTime));
        const workout: Omit<Workout, 'id'> = {
          date,
          type,
          title: s.title || sport(type).title,
          durationMin: Math.max(1, Math.round(minutes(s.startTime, s.endTime))),
          externalId: s.metadata?.id,
        };
        if (type !== 'gym' && can.has('Distance')) {
          await attempt(async () => {
            const km = Math.round((await aggregateRecord({ recordType: 'Distance', timeRangeFilter: range })).DISTANCE.inKilometers * 100) / 100;
            if (km > 0) workout.distanceKm = km;
          });
        }
        if (can.has('HeartRate')) {
          await attempt(async () => {
            const hr = await aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: range });
            if (hr.MEASUREMENTS_COUNT > 0) {
              workout.avgHeartRate = Math.round(hr.BPM_AVG);
              workout.maxHeartRate = Math.round(hr.BPM_MAX);
            }
          });
        }
        if (can.has('ActiveCaloriesBurned')) {
          await attempt(async () => {
            const kcal = (await aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: range })).ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0;
            if (kcal > 0) workout.kcal = Math.round(kcal);
          });
        }
        workouts.push(workout);
      }
    });
  }

  return { day, workouts };
}

type SyncDispatch = (a: { type: 'syncHealth'; date: DateKey; day: HealthDay; workouts: Omit<Workout, 'id'>[] }) => void;

/** Sync yesterday and today (yesterday's "asleep by 23:00" only becomes known this morning). */
export async function syncHealth(dispatch: SyncDispatch) {
  if (!(await healthAvailable())) return;
  await initialize();
  const today = todayKey();
  const can = await grantedTypes();
  for (const date of [addDays(today, -1), today]) {
    const { day, workouts } = await readDay(date, can);
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
