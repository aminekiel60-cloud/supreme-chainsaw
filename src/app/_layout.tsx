import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useHealthSync } from '@/lib/health';
import { useStreakReminders } from '@/lib/reminders';
import { cloudEnabled } from '@/lib/supabase';
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
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}

function RootStack() {
  const { state, dispatch, ready: storeReady } = useStore();
  const auth = useAuth();
  const ready = storeReady && auth.ready;
  const signedIn = !cloudEnabled || auth.session !== null;
  const onboarded = state.profile !== null;
  useStreakReminders(state, ready && signedIn);
  useHealthSync(ready && signedIn && state.settings.healthConnect, dispatch);

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
      {/* Order: sign in (when accounts are enabled) → onboarding → the app. */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-food" options={{ presentation: 'modal', title: 'Add food' }} />
        <Stack.Screen name="log-workout" options={{ presentation: 'modal', title: 'Log workout' }} />
        <Stack.Screen name="photo" options={{ presentation: 'modal', title: 'AI food photo' }} />
        <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan barcode' }} />
        <Stack.Screen name="post/[id]" options={{ presentation: 'modal', title: 'Comments' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal', title: 'Profile & settings' }} />
      </Stack.Protected>
    </Stack>
  );
}
