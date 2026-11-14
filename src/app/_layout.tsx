import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Celebration } from '@/components/Celebration';
import { FloatingWorkout } from '@/components/FloatingWorkout';
import { KeyboardRoot } from '@/components/FormScroll';
import { LogoIntro } from '@/components/LogoIntro';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useCelebrations } from '@/lib/celebrations';
import { useHealthSync } from '@/lib/health';
import { usePendingInvite } from '@/lib/invites';
import { useNotificationLinks, useStreakReminders } from '@/lib/reminders';
import { setTrainingNow } from '@/lib/social';
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
  useNotificationLinks(ready && signedIn && onboarded);
  usePendingInvite(ready && signedIn && onboarded);
  useHealthSync(ready && signedIn && state.settings.healthConnect, dispatch);
  const celebration = useCelebrations(state, ready && signedIn && onboarded, dispatch);
  const [showIntro, setShowIntro] = useState(true);
  const hideIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Friends see "Training now" while you're in a live workout.
  const training = Boolean(state.activeWorkout);
  useEffect(() => {
    if (ready && cloudEnabled && auth.session) setTrainingNow(training).catch(() => {});
  }, [training, ready, auth.session]);

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
          <Stack.Screen name="exercise-picker" options={({ route }) => ({ presentation: 'modal', title: (route.params as { target?: string } | undefined)?.target === 'browse' ? 'Exercises' : 'Add exercise' })} />
          <Stack.Screen name="exercise/[name]" options={{ title: 'Exercise' }} />
          <Stack.Screen name="routines" options={{ title: 'Routines' }} />
          <Stack.Screen name="body-weight" options={{ title: 'Body weight' }} />
          <Stack.Screen name="review" options={{ title: 'Week in review' }} />
          <Stack.Screen name="devices" options={{ title: 'Connected devices' }} />
          <Stack.Screen name="photo" options={{ presentation: 'modal', title: 'AI food photo' }} />
          <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan barcode' }} />
          <Stack.Screen name="post/[id]" options={{ presentation: 'modal', title: 'Comments' }} />
          <Stack.Screen name="privacy" options={{ presentation: 'modal', title: 'Privacy policy' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Settings' }} />
          <Stack.Screen name="food/[id]" options={{ presentation: 'modal', title: 'Edit food' }} />
          <Stack.Screen name="goals" options={{ presentation: 'modal', title: 'Your goals' }} />
          <Stack.Screen name="my-food" options={{ presentation: 'modal', title: 'Create food' }} />
          <Stack.Screen name="friends" options={{ title: 'Friends' }} />
          <Stack.Screen name="coach-access" options={{ title: 'Coach access' }} />
          <Stack.Screen name="client/[id]" options={{ title: 'Your client' }} />
          <Stack.Screen name="nutrition" options={{ title: 'Food diary' }} />
          <Stack.Screen name="feed" options={{ title: 'Feed' }} />
          <Stack.Screen name="new-post" options={{ presentation: 'modal', title: 'New post' }} />
          <Stack.Screen name="programs" options={{ title: 'Programs' }} />
          <Stack.Screen name="tools" options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="body" options={{ title: 'Body' }} />
          <Stack.Screen name="grocery" options={{ title: 'Grocery list' }} />
          <Stack.Screen name="meals" options={{ presentation: 'modal', title: 'Saved meals' }} />
          <Stack.Screen name="run" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="weekly-coach" options={{ title: 'Weekly coach' }} />
          <Stack.Screen name="blocked" options={{ title: 'Blocked people' }} />
          <Stack.Screen name="challenges" options={{ title: 'Challenges' }} />
          <Stack.Screen name="history" options={{ title: 'All workouts' }} />
          <Stack.Screen name="records" options={{ title: 'Personal records' }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
          <Stack.Screen name="badges" options={{ title: 'Badges' }} />
        </Stack.Protected>
      </Stack>
      {signedIn && onboarded && <FloatingWorkout />}
      {celebration.kind && <Celebration kind={celebration.kind} level={celebration.level} onDone={celebration.clear} />}
      {showIntro && <LogoIntro onDone={hideIntro} />}
    </View>
  );
}
