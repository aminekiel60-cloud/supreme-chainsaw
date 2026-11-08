import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useHealthSync } from '@/lib/health';
import { useStreakReminders } from '@/lib/reminders';
import { StoreProvider, useStore } from '@/store/store';

// Keep the splash screen up until saved data has loaded.
SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.lime,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function RootLayout() {
  return (
    <StoreProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <RootStack />
      </ThemeProvider>
    </StoreProvider>
  );
}

function RootStack() {
  const { state, dispatch, ready } = useStore();
  const onboarded = state.profile !== null;
  useStreakReminders(state, ready);
  useHealthSync(ready && state.settings.healthConnect, dispatch);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.lime,
        headerTitleStyle: { color: Colors.text, fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.background },
      }}>
      {/* First launch: only onboarding is reachable until a profile exists. */}
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-food" options={{ presentation: 'modal', title: 'Add food' }} />
        <Stack.Screen name="log-workout" options={{ presentation: 'modal', title: 'Log workout' }} />
        <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan barcode' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal', title: 'Profile & settings' }} />
      </Stack.Protected>
    </Stack>
  );
}
