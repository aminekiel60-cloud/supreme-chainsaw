/** Web version: browsers handle the keyboard themselves. */
import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

export function FormScroll({ children, contentContainerStyle }: { children: ReactNode; contentContainerStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={[{ padding: 16, gap: 16, paddingBottom: 48 }, contentContainerStyle]}>
      {children}
    </ScrollView>
  );
}

export function KeyboardRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
