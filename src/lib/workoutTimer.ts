/** Timers for live workouts: elapsed time, rest countdown and the "rest over" notification. */
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

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

/** Notify in `seconds`, even if the app is in the background. Returns the notification id. */
export async function scheduleRestNotification(seconds: number): Promise<string | null> {
  if (Platform.OS === 'web' || seconds < 1) return null;
  try {
    await ensureChannel();
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest over 💪', body: 'Next set — lock in.', data: { kind: 'rest' }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(seconds), channelId: CHANNEL },
    });
  } catch {
    return null;
  }
}

export async function cancelRestNotification(id?: string | null) {
  if (!id || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
