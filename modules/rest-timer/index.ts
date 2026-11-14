/**
 * Live rest countdown in the notification bar (Android only).
 * Does nothing on other platforms or in builds without the native module.
 */
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type RestTimerNative = {
  show(endsAtMillis: number, title: string, body: string): void;
  hide(): void;
};

const native = Platform.OS === 'android' ? requireOptionalNativeModule<RestTimerNative>('RestTimerNotification') : null;

export function showRestCountdown(endsAtMillis: number, title: string, body: string) {
  try {
    native?.show(endsAtMillis, title, body);
  } catch {
    // no live countdown; the "rest over" notification still comes
  }
}

export function hideRestCountdown() {
  try {
    native?.hide();
  } catch {
    // nothing to hide
  }
}
