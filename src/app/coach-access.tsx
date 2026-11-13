/** COACH — friends who share their nutrition with you, and who you share yours with. */
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button, Card, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getCoachLinks, type CoachLinks } from '@/lib/social';

export default function CoachScreen() {
  const [links, setLinks] = useState<CoachLinks | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCoachLinks().then(setLinks).catch(() => setLinks({ myCoaches: [], myClients: [] }));
    }, []),
  );

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <Card highlight style={{ gap: Spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="clipboard" size={20} color={Colors.lime} />
          <Text style={[ui.text, { fontWeight: '800' }]}>How Coach works</Text>
        </View>
        <Text style={ui.muted}>
          Friends always see your workouts. Your calories, macros and meals stay private — unless you turn on “Coach” for a
          specific friend, like a gym buddy or personal trainer. You can turn it off any time.
        </Text>
      </Card>

      <SectionTitle>You coach</SectionTitle>
      {links?.myClients.length === 0 && (
        <Card>
          <Text style={ui.muted}>Nobody shares their nutrition with you yet. Ask a friend to turn on Coach for you in their Friends list.</Text>
        </Card>
      )}
      {links?.myClients.map((c) => (
        <Pressable key={c.id} onPress={() => router.push({ pathname: '/client/[id]', params: { id: c.id, name: c.display_name } })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Avatar name={c.display_name} url={c.avatar_url} level={c.level} />
            <View style={{ flex: 1 }}>
              <Text style={[ui.text, { fontWeight: '800' }]}>{c.display_name}</Text>
              <Text style={ui.muted}>🔥 {c.streak} day streak · tap for today’s food and training</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
          </Card>
        </Pressable>
      ))}

      <SectionTitle>Your coaches</SectionTitle>
      <Card style={{ gap: Spacing.md }}>
        <Text style={ui.muted}>
          {links?.myCoaches.length
            ? `${links.myCoaches.length} friend${links.myCoaches.length > 1 ? 's' : ''} can see your nutrition.`
            : 'Nobody can see your nutrition.'}
        </Text>
        <Button title="Choose coaches" icon="people" variant="ghost" onPress={() => router.push('/friends')} />
      </Card>
    </ScrollView>
  );
}
