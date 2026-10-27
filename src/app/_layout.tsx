import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { StoreProvider } from '@/store/store';

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
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.lime,
            headerTitleStyle: { color: Colors.text, fontWeight: '700' },
            contentStyle: { backgroundColor: Colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-food" options={{ presentation: 'modal', title: 'Add food' }} />
          <Stack.Screen name="log-workout" options={{ presentation: 'modal', title: 'Log workout' }} />
        </Stack>
      </ThemeProvider>
    </StoreProvider>
  );
}
