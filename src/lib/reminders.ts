/**
 * Local "don't break your streak" reminders.
 * Every time your data changes we re-plan the next 7 evenings:
 * today's reminder is skipped once you're already locked in.
 * Nothing leaves the phone — these are local notifications, no server needed.
 */
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { addDays, fromKey, startOfWeek, todayKey } from '@/store/dates';
import { currentStreak, isLockedIn } from '@/store/logic';
import type { AppState } from '@/store/types';

const CHANNEL = 'streak-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt after a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Streak reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#A3FF3F',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Cancel only our reminders — never a rest timer that may be running. */
async function cancelReminders() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.content.data?.kind === 'reminder').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

async function plan(state: AppState) {
  await cancelReminders();
  if (!state.settings.reminders || !state.profile) return;
  if (!(await ensurePermission())) return;

  const today = todayKey();
  const streak = currentStreak(state);
  const now = Date.now();

  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i);
    if (i === 0 && isLockedIn(state, day)) continue;
    const when = fromKey(day);
    when.setHours(state.settings.reminderHour, 0, 0, 0);
    if (when.getTime() <= now) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: i === 0 && streak > 0 ? `🔥 Your ${streak}-day streak is at risk` : '🔒 Time to lock in',
        body: 'Tick off your habits and log your food before the day ends. LOCK IN. LEVEL UP.',
        data: { kind: 'reminder' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
    });
  }

  // Sunday 18:00: your week in review is ready.
  const sunday = fromKey(addDays(startOfWeek(today), 6));
  sunday.setHours(18, 0, 0, 0);
  if (sunday.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Your week in review is ready',
        body: 'See your workouts, active time and PRs, and share your week.',
        data: { kind: 'reminder', url: '/review' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sunday, channelId: CHANNEL },
    });
  }
}

/** Opens the screen a notification points to (e.g. the week review) when you tap it. */
export function useNotificationLinks(active: boolean) {
  const response = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const id = response?.notification.request.identifier;
    const url = response?.notification.request.content.data?.url;
    if (!active || !id || handled.current === id || typeof url !== 'string') return;
    handled.current = id;
    router.push(url as Href);
  }, [active, response]);
}

/** Keeps scheduled reminders in sync with your data. Mount once, at the app root. */
export function useStreakReminders(state: AppState, ready: boolean) {
  const today = todayKey();
  const lockedInToday = isLockedIn(state, today);
  const { reminders, reminderHour } = state.settings;
  const onboarded = state.profile !== null;

  useEffect(() => {
    if (!ready) return;
    plan(state).catch(() => {});
    // Only re-plan when something that affects the reminders changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, today, lockedInToday, reminders, reminderHour, onboarded]);
}
