/** PROFILE — edit your details and goals, reminders, and reset your data. */
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { ProfileForm } from '@/components/ProfileForm';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { connectHealth, openHealthConnectSettings } from '@/lib/health';
import { cloudEnabled, db } from '@/lib/supabase';
import { useStore } from '@/store/store';

const REMINDER_HOURS = [18, 19, 20, 21, 22];

export default function ProfileScreen() {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const { session, signOut } = useAuth();

  const deleteAccount = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, your logged data, posts, comments and friends. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            const { error } = await db().functions.invoke('delete-account', { method: 'POST' });
            if (error) {
              Alert.alert('Could not delete your account', 'Please try again later.');
              return;
            }
            await signOut();
          },
        },
      ],
    );

  const reset = () => {
    const run = () => dispatch({ type: 'reset' });
    const message = 'This deletes your profile, food, workouts and habits from this phone.';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert('Reset all data?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Health Connect</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[ui.text, { flex: 1 }]}>Sync steps, sleep, heart rate and workouts</Text>
          <Switch
            value={settings.healthConnect}
            onValueChange={async (on) => {
              if (on && !(await connectHealth())) {
                Alert.alert('Health Connect', 'Health Connect is not available or permission was not given.');
                return;
              }
              dispatch({ type: 'setSettings', settings: { ...settings, healthConnect: on } });
            }}
            trackColor={{ true: Colors.lime, false: Colors.border }}
            thumbColor={Colors.text}
          />
        </View>
        {settings.healthConnect && Platform.OS === 'android' && (
          <Button title="Manage Health Connect permissions" icon="settings" variant="ghost" onPress={openHealthConnectSettings} />
        )}
        <Text style={ui.muted}>
          Using Garmin? In the Garmin Connect app, allow it to share data with Health Connect.
        </Text>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Reminders</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={ui.text}>Daily streak reminder</Text>
          <Switch
            value={settings.reminders}
            onValueChange={(reminders) => dispatch({ type: 'setSettings', settings: { ...settings, reminders } })}
            trackColor={{ true: Colors.lime, false: Colors.border }}
            thumbColor={Colors.text}
          />
        </View>
        {settings.reminders && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {REMINDER_HOURS.map((h) => (
              <Chip
                key={h}
                label={`${h}:00`}
                active={settings.reminderHour === h}
                onPress={() => dispatch({ type: 'setSettings', settings: { ...settings, reminderHour: h } })}
              />
            ))}
          </View>
        )}
      </Card>

      <ProfileForm
        initial={state.profile}
        submitLabel="Save and update goals"
        onSubmit={(profile) => {
          dispatch({ type: 'setProfile', profile });
          router.back();
        }}
      />

      {cloudEnabled ? (
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle>Account</SectionTitle>
          <Text style={ui.muted}>Signed in as {session?.user.email}</Text>
          <Button title="Sign out" icon="log-out" variant="ghost" onPress={signOut} />
          <Pressable onPress={deleteAccount} style={{ paddingVertical: 8 }}>
            <Text style={{ color: Colors.danger, textAlign: 'center', fontWeight: '600' }}>Delete my account</Text>
          </Pressable>
        </Card>
      ) : (
        <Button title="Reset all data" icon="trash" variant="ghost" onPress={reset} />
      )}
    </ScrollView>
  );
}
