/**
 * GPS for the run tracker that keeps going with the screen off.
 *
 * On Android this starts a foreground service: a "Run in progress"
 * notification stays visible while you track, and GPS points keep coming in
 * when the screen is locked. It only needs the normal "while using the app"
 * location permission, because the service is started while the app is open.
 *
 * Where that isn't available (web, or the service can't start), it falls back
 * to normal updates, which pause when the app is in the background.
 *
 * This file must be imported at the app root: the task has to be defined
 * before the system delivers locations to it.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';

const TASK = 'lockedin-run-location';

type Listener = (loc: Location.LocationObject) => void;
let listener: Listener | null = null;
let fallback: Location.LocationSubscription | null = null;

if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
    if (error || !data?.locations) return;
    // Points can arrive in batches when the phone saves battery; oldest first.
    for (const loc of [...data.locations].sort((a, b) => a.timestamp - b.timestamp)) listener?.(loc);
  });
}

const OPTIONS: Location.LocationOptions = { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 };

/**
 * Start receiving GPS points. Returns true when tracking also works with the
 * screen off, false when it only works while the app is on screen.
 */
export async function startRunTracking(onLocation: Listener, onError: () => void): Promise<boolean> {
  listener = onLocation;
  if (Platform.OS !== 'web') {
    try {
      await Location.startLocationUpdatesAsync(TASK, {
        ...OPTIONS,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Run in progress',
          notificationBody: 'Locked in is tracking your route. Open the app to pause or finish.',
          notificationColor: Colors.lime,
          killServiceOnDestroy: true,
        },
      });
      return true;
    } catch {
      // fall through to normal updates
    }
  }
  fallback = await Location.watchPositionAsync(OPTIONS, (loc) => listener?.(loc), onError);
  return false;
}

export async function stopRunTracking() {
  listener = null;
  fallback?.remove();
  fallback = null;
  if (Platform.OS === 'web') return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  } catch {
    // already stopped
  }
}
