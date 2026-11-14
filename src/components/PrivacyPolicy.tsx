import { ScrollView, Text } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/theme';
import { PRIVACY_POLICY, PRIVACY_UPDATED } from '@/data/privacy';
import { Card, styles as ui } from './ui';

/** The privacy policy as scrollable cards. */
export function PrivacyPolicy() {
  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
      {PRIVACY_POLICY.map((s) => (
        <Card key={s.title} style={{ gap: Spacing.sm }}>
          <Text style={[Type.heading, { color: Colors.text }]}>{s.title}</Text>
          <Text style={[ui.text, { lineHeight: 22 }]}>{s.body}</Text>
        </Card>
      ))}
      <Text style={[ui.muted, { textAlign: 'center' }]}>Last updated: {PRIVACY_UPDATED}</Text>
    </ScrollView>
  );
}
