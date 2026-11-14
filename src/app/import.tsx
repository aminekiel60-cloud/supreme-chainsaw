/** IMPORT WORKOUTS: bring your history from Strong or Hevy (their CSV export). */
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';

import { StackPage } from '@/components/layout';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { readExport, type ImportResult } from '@/lib/importWorkouts';
import { prettyDate } from '@/store/dates';
import { useStore } from '@/store/store';

async function readText(uri: string, file?: File) {
  if (Platform.OS === 'web') return file ? file.text() : (await fetch(uri)).text();
  const { File: FsFile } = await import('expo-file-system');
  return new FsFile(uri).text();
}

export default function ImportScreen() {
  const { state, dispatch } = useStore();
  const [lbs, setLbs] = useState(state.settings.units === 'lb');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    setBusy(true);
    try {
      const asset = res.assets[0];
      const text = await readText(asset.uri, (asset as { file?: File }).file);
      setResult(readExport(text, lbs));
    } catch (e) {
      Alert.alert('Could not read this file', e instanceof Error ? e.message : 'Try exporting it again as CSV.');
    } finally {
      setBusy(false);
    }
  };

  const existing = new Set(state.workouts.map((w) => w.externalId).filter(Boolean));
  const fresh = result?.workouts.filter((w) => !existing.has(w.externalId)) ?? [];

  const doImport = () => {
    if (!result) return;
    haptics.success();
    dispatch({
      type: 'apply',
      change: (s) => {
        const have = new Set(s.workouts.map((w) => w.externalId).filter(Boolean));
        return { workouts: [...s.workouts, ...result.workouts.filter((w) => !have.has(w.externalId))] };
      },
    });
    Alert.alert('Imported', `${fresh.length} workouts are in your history now. Your records and charts include them.`, [{ text: 'See records', onPress: () => router.replace('/records') }, { text: 'OK' }]);
    setResult(null);
  };

  return (
    <StackPage>
      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>How to export</SectionTitle>
        <Text style={ui.text}>
          <Text style={{ fontWeight: '800' }}>Strong:</Text> Settings, Export data, Export as CSV.
        </Text>
        <Text style={ui.text}>
          <Text style={{ fontWeight: '800' }}>Hevy:</Text> Profile, Settings, Export and import data, Export workouts.
        </Text>
        <Text style={ui.muted}>Save the file on your phone (or send it to yourself), then pick it below. Nothing is uploaded: the file is read on your phone.</Text>
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <Text style={ui.muted}>Weights in your Strong file are in</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="kg" active={!lbs} onPress={() => setLbs(false)} />
          <Chip label="lbs" active={lbs} onPress={() => setLbs(true)} />
        </View>
        <Text style={ui.muted}>Hevy files say it themselves.</Text>
      </Card>

      {busy ? <ActivityIndicator color={Colors.lime} /> : <Button title="Choose the CSV file" icon="document-attach" onPress={pick} />}

      {result && (
        <Card highlight style={{ gap: Spacing.sm }}>
          <SectionTitle>{result.source === 'hevy' ? 'Hevy export' : 'Strong export'}</SectionTitle>
          <Text style={ui.text}>
            {result.workouts.length} workouts
            {result.workouts.length ? `, from ${prettyDate(result.workouts[0].date)} to ${prettyDate(result.workouts[result.workouts.length - 1].date)}` : ''}.
          </Text>
          {fresh.length < result.workouts.length && <Text style={ui.muted}>{result.workouts.length - fresh.length} of them are already in your history and are skipped.</Text>}
          <Text style={ui.muted}>
            {result.matched} exercises matched the Locked in library.
            {result.ownNames.length ? ` These stay as your own exercises: ${result.ownNames.slice(0, 8).join(', ')}${result.ownNames.length > 8 ? ` and ${result.ownNames.length - 8} more` : ''}. You can set their muscle on the exercise page.` : ''}
          </Text>
          <Button title={fresh.length ? `Import ${fresh.length} workouts` : 'Nothing new to import'} icon="cloud-download" disabled={!fresh.length} onPress={doImport} />
        </Card>
      )}
    </StackPage>
  );
}
