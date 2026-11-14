/** PROFILE — edit your details and goals, reminders, and reset your data. */
import { router } from 'expo-router';
import { Alert, Platform, Pressable, Switch, Text, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { ProfileForm } from '@/components/ProfileForm';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { connectHealth, openHealthConnectSettings } from '@/lib/health';
import { cloudEnabled, db } from '@/lib/supabase';
import { REST_OPTIONS, restLabel } from '@/lib/workoutTimer';
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
    <FormScroll>
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
          <>
            <Button
              title="Allow new data types"
              icon="add-circle"
              variant="ghost"
              onPress={() => connectHealth().then((ok) => Alert.alert(ok ? 'Permissions updated' : 'Health Connect', ok ? 'Locked in now syncs everything you allowed.' : 'Permission was not given.'))}
            />
            <Button title="Manage Health Connect permissions" icon="settings" variant="ghost" onPress={openHealthConnectSettings} />
          </>
        )}
        <Button title="Connected devices" icon="watch" variant="ghost" onPress={() => router.push('/devices')} />
        <Text style={ui.muted}>
          Works with Samsung Health, Garmin Connect, Fitbit, Google Fit and more. They all share their data through Health Connect.
        </Text>
        <Text style={ui.muted}>
          • Samsung Health: open Samsung Health → ⋮ → Settings → Health Connect, and allow sharing.{'\n'}• Garmin: in Garmin Connect →
          More → Settings → Connected apps → Health Connect.
        </Text>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Start screen</SectionTitle>
        <Text style={ui.muted}>The page the app opens on.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {(
            [
              ['today', 'Today'],
              ['food', 'Food diary'],
              ['coach', 'Workouts'],
              ['feed', 'Feed'],
            ] as const
          ).map(([id, label]) => (
            <Chip key={id} label={label} active={settings.startScreen === id} onPress={() => dispatch({ type: 'setSettings', settings: { ...settings, startScreen: id } })} />
          ))}
        </View>
        <Text style={ui.muted}>The big ring on Today shows</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          <Chip label="Calories" active={settings.bigRing === 'calories'} onPress={() => dispatch({ type: 'setSettings', settings: { ...settings, bigRing: 'calories' } })} />
          <Chip label="Habits" active={settings.bigRing === 'habits'} onPress={() => dispatch({ type: 'setSettings', settings: { ...settings, bigRing: 'habits' } })} />
        </View>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Units</SectionTitle>
        <Text style={ui.muted}>Weights in workouts, records and body weight.</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="Kilograms (kg)" active={settings.units !== 'lb'} onPress={() => dispatch({ type: 'setSettings', settings: { ...settings, units: 'kg' } })} />
          <Chip label="Pounds (lbs)" active={settings.units === 'lb'} onPress={() => dispatch({ type: 'setSettings', settings: { ...settings, units: 'lb' } })} />
        </View>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Rest timer</SectionTitle>
        <Text style={ui.muted}>Starts when you tick off a set. Pick Off to never start it. You can also set it per exercise in a workout.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {REST_OPTIONS.map((sec) => (
            <Chip
              key={sec}
              label={restLabel(sec)}
              active={settings.restSeconds === sec}
              onPress={() => dispatch({ type: 'setSettings', settings: { ...settings, restSeconds: sec } })}
            />
          ))}
        </View>
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

      <Button title="Privacy policy" icon="shield-checkmark" variant="ghost" onPress={() => router.push('/privacy')} />
      {cloudEnabled && <Button title="Blocked people" icon="hand-left-outline" variant="ghost" onPress={() => router.push('/blocked')} />}

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
    </FormScroll>
  );
}
