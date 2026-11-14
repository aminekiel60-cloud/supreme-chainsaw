/**
 * Scroll view for forms: keeps the field you're typing in visible above the
 * keyboard (Android apps are edge-to-edge, so the window no longer resizes).
 */
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView, KeyboardProvider } from 'react-native-keyboard-controller';

import { Colors } from '@/constants/theme';

export function FormScroll({ children, contentContainerStyle }: { children: ReactNode; contentContainerStyle?: StyleProp<ViewStyle> }) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={[{ padding: 16, gap: 16, paddingBottom: 48 }, contentContainerStyle]}>
      {children}
    </KeyboardAwareScrollView>
  );
}

/** Wraps the app once so keyboard-aware views work. */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
