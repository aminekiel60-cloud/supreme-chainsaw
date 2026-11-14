/** Timers for live workouts: elapsed time, rest countdown and the "rest over" notification. */
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { hideRestCountdown, showRestCountdown } from '../../modules/rest-timer';

const CHANNEL = 'workout';

/** The current time, refreshed every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Rest timer choices in seconds; 0 means no rest timer. */
export const REST_OPTIONS = [0, 60, 90, 120, 150, 180, 240, 300];
export const restLabel = (sec: number) => (sec === 0 ? 'Off' : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);

/** 90 → "1:30", 3725 → "1:02:05" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Workout timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 100, 250],
      lightColor: '#A3FF3F',
    });
  }
}

// Rest notifications are handled one at a time, so two quick taps can never leave
// an extra "rest over" notification behind.
let queue: Promise<unknown> = Promise.resolve();

async function cancelAllRest() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.content.data?.kind === 'rest').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
}

/** Replace any pending "rest over" notification with one in `seconds`, even if the app is in the background. */
export function scheduleRestNotification(seconds: number): Promise<string | null> {
  if (Platform.OS === 'web' || seconds < 1) return Promise.resolve(null);
  const job = queue.then(async () => {
    try {
      await cancelAllRest();
      await ensureChannel();
      // First rest of a first workout: ask once whether we may notify.
      let perm = await Notifications.getPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) return null;
      showRestCountdown(Date.now() + seconds * 1000, 'Rest', 'Next set when the timer ends. Tap to open your workout.');
      return await Notifications.scheduleNotificationAsync({
        content: { title: 'Rest over 💪', body: 'Time for your next set.', data: { kind: 'rest' }, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(seconds), channelId: CHANNEL },
      });
    } catch {
      return null;
    }
  });
  queue = job;
  return job;
}

/** Remove the pending "rest over" notification, if there is one. */
export function cancelRestNotification(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  hideRestCountdown();
  const job = queue.then(() => cancelAllRest().catch(() => {}));
  queue = job;
  return job;
}
