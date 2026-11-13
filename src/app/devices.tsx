/** CONNECTED DEVICES — how each watch brand gets its data into Locked in, and what's synced. */
import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Platform, ScrollView, Text, View } from 'react-native';

import { Badge, Button, Card, SectionTitle, styles as ui, type IconName } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { connectHealth, openHealthConnectSettings } from '@/lib/health';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';

type Device = { name: string; icon: IconName; app: string; steps: string[]; pkg?: string };

/** Every brand below writes to Health Connect from its own app. */
const DEVICES: Device[] = [
  {
    name: 'Garmin',
    icon: 'watch',
    app: 'Garmin Connect',
    pkg: 'com.garmin.android.apps.connectmobile',
    steps: ['Open Garmin Connect', 'More → Settings → Connected apps → Health Connect', 'Turn on everything you want to share'],
  },
  {
    name: 'Polar',
    icon: 'heart-circle',
    app: 'Polar Flow',
    pkg: 'fi.polar.polarflow',
    steps: ['Open Polar Flow', 'Settings → General settings → Health Connect', 'Turn on sharing'],
  },
  {
    name: 'Samsung Galaxy Watch',
    icon: 'watch',
    app: 'Samsung Health',
    pkg: 'com.sec.android.app.shealth',
    steps: ['Open Samsung Health', '⋮ → Settings → Health Connect', 'Allow all data types'],
  },
  {
    name: 'Fitbit / Pixel Watch',
    icon: 'fitness',
    app: 'Fitbit',
    pkg: 'com.fitbit.FitbitMobile',
    steps: ['Open Fitbit', 'You → Settings → Health Connect', 'Turn on sync'],
  },
  {
    name: 'Other (Xiaomi, Huawei, Oura, Whoop, Withings…)',
    icon: 'bluetooth',
    app: 'the brand’s own app',
    steps: ['Open the brand’s app', 'Look for “Health Connect” in its settings', 'Turn on sharing'],
  },
];

const SYNCED = [
  ['Steps', 'ticks your steps habit'],
  ['Sleep + stages', 'sleep time, deep / REM / light'],
  ['Resting heart rate & HRV', 'power your readiness score'],
  ['Workouts', 'with distance, heart rate and calories'],
  ['Active calories', 'what you burned by moving'],
  ['Body weight', 'from a smart scale'],
];

export default function DevicesScreen() {
  const { state, dispatch } = useStore();
  const connected = state.settings.healthConnect;
  const today = state.health[todayKey()];

  const connect = async () => {
    if (await connectHealth()) dispatch({ type: 'setSettings', settings: { ...state.settings, healthConnect: true } });
    else Alert.alert('Health Connect', Platform.OS === 'android' ? 'Install or update Health Connect from the Play Store, then try again.' : 'Health Connect is only available on Android.');
  };

  const openApp = (d: Device) => {
    if (!d.pkg) return;
    Linking.openURL(`market://details?id=${d.pkg}`).catch(() => Linking.openURL(`https://play.google.com/store/apps/details?id=${d.pkg}`).catch(() => {}));
  };

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <Card highlight={connected} style={{ gap: Spacing.md }}>
        <SectionTitle action={<Badge text={connected ? 'CONNECTED' : 'NOT CONNECTED'} />}>Health Connect</SectionTitle>
        <Text style={ui.muted}>
          Health Connect is Android&apos;s shared health hub. Your watch app writes to it, Locked in reads from it — the same numbers your watch
          measured, with no extra account.
        </Text>
        {connected ? (
          <>
            <Text style={ui.text}>
              Today: {today ? `${today.steps.toLocaleString('en-US')} steps` : 'nothing synced yet'}
              {today?.restingHeartRate ? ` · resting HR ${today.restingHeartRate}` : ''}
              {today?.hrv ? ` · HRV ${today.hrv} ms` : ''}
            </Text>
            <Button title="Allow new data types" icon="add-circle" variant="ghost" onPress={connect} />
            <Button title="Manage permissions" icon="settings" variant="ghost" onPress={openHealthConnectSettings} />
          </>
        ) : (
          <Button title="Connect Health Connect" icon="heart" onPress={connect} />
        )}
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>What gets synced</SectionTitle>
        {SYNCED.map(([title, detail]) => (
          <View key={title} style={{ flexDirection: 'row', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.lime} />
            <Text style={[ui.text, { flex: 1 }]}>
              {title} <Text style={ui.muted}>— {detail}</Text>
            </Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Set up your watch</SectionTitle>
      {DEVICES.map((d) => (
        <Card key={d.name} style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Ionicons name={d.icon} size={22} color={Colors.lime} />
            <Text style={[ui.text, { fontWeight: '800', flex: 1 }]}>{d.name}</Text>
            {d.pkg && (
              <Text onPress={() => openApp(d)} style={{ color: Colors.lime, fontWeight: '700' }}>
                Get {d.app}
              </Text>
            )}
          </View>
          {d.steps.map((step, i) => (
            <Text key={i} style={ui.muted}>
              {i + 1}. {step}
            </Text>
          ))}
        </Card>
      ))}

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>Apple Watch</SectionTitle>
        <Text style={ui.muted}>
          Apple Watch data lives in Apple Health on an iPhone and can&apos;t be read from Android. It will sync in the iPhone version of Locked
          in.
        </Text>
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle action={<Badge text="PLANNED" />}>Direct Garmin & Polar links</SectionTitle>
        <Text style={ui.muted}>
          A direct cloud link adds extras such as training load and heart-rate zones. Garmin only gives that access to approved companies, and
          Polar needs an API account — both are on the roadmap. Until then, Health Connect delivers the same measurements your watch recorded.
        </Text>
      </Card>
    </ScrollView>
  );
}
