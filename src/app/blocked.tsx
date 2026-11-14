/** BLOCKED PEOPLE: everyone you blocked, with a button to unblock. */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { StackPage } from '@/components/layout';
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { listBlocked, unblockUser, type PublicProfile } from '@/lib/social';

export default function BlockedScreen() {
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const load = useCallback(() => {
    listBlocked()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);
  useFocusEffect(load);

  return (
    <StackPage>
      {people === null && <ActivityIndicator color={Colors.lime} />}
      {people?.length === 0 && (
        <Card>
          <Text style={ui.muted}>You have not blocked anyone. To block someone, tap the three dots on one of their posts.</Text>
        </Card>
      )}
      {people?.map((p) => (
        <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Avatar name={p.display_name} url={p.avatar_url} />
          <Text style={[ui.text, { flex: 1, fontWeight: '700' }]}>{p.display_name}</Text>
          <View style={{ width: 120 }}>
            <Button
              title="Unblock"
              variant="ghost"
              onPress={() =>
                unblockUser(p.id)
                  .then(load)
                  .catch(() => Alert.alert('Could not unblock', 'Check your connection and try again.'))
              }
            />
          </View>
        </Card>
      ))}
    </StackPage>
  );
}
