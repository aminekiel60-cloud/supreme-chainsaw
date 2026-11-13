import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Celebration } from '@/components/Celebration';
import { KeyboardRoot } from '@/components/FormScroll';
import { LogoIntro } from '@/components/LogoIntro';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useCelebrations } from '@/lib/celebrations';
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
          <KeyboardRoot>
            <RootStack />
          </KeyboardRoot>
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
  const celebration = useCelebrations(state, ready && signedIn && onboarded, dispatch);
  const [showIntro, setShowIntro] = useState(true);
  const hideIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.lime,
          headerTitleStyle: { color: Colors.text, fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade_from_bottom',
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
          <Stack.Screen name="active-workout" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="exercise-picker" options={{ presentation: 'modal', title: 'Add exercise' }} />
          <Stack.Screen name="exercise/[name]" options={{ title: 'Exercise' }} />
          <Stack.Screen name="routines" options={{ title: 'Routines' }} />
          <Stack.Screen name="body-weight" options={{ title: 'Body weight' }} />
          <Stack.Screen name="photo" options={{ presentation: 'modal', title: 'AI food photo' }} />
          <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan barcode' }} />
          <Stack.Screen name="post/[id]" options={{ presentation: 'modal', title: 'Comments' }} />
          <Stack.Screen name="privacy" options={{ presentation: 'modal', title: 'Privacy policy' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Settings' }} />
          <Stack.Screen name="food/[id]" options={{ presentation: 'modal', title: 'Edit food' }} />
          <Stack.Screen name="goals" options={{ presentation: 'modal', title: 'Your goals' }} />
          <Stack.Screen name="my-food" options={{ presentation: 'modal', title: 'Create food' }} />
          <Stack.Screen name="friends" options={{ title: 'Friends' }} />
          <Stack.Screen name="coach" options={{ title: 'Coach' }} />
          <Stack.Screen name="coach/[id]" options={{ title: 'Coach' }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
          <Stack.Screen name="badges" options={{ title: 'Badges' }} />
        </Stack.Protected>
      </Stack>
      {celebration.kind && <Celebration kind={celebration.kind} level={celebration.level} onDone={celebration.clear} />}
      {showIntro && <LogoIntro onDone={hideIntro} />}
    </View>
  );
}
