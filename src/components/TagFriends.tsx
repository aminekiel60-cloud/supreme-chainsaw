/** Pick friends who trained with you. Only shown when accounts are enabled. */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { listFriendships, type PublicProfile } from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';
import { Chip, styles as ui } from './ui';

export function TagFriends({
  value,
  onChange,
}: {
  value: { id: string; name: string }[];
  onChange: (v: { id: string; name: string }[]) => void;
}) {
  const [friends, setFriends] = useState<PublicProfile[] | null>(null);

  useEffect(() => {
    if (!cloudEnabled) return;
    listFriendships()
      .then((fs) => setFriends(fs.filter((f) => f.status === 'accepted').map((f) => f.friend)))
      .catch(() => setFriends([]));
  }, []);

  if (!cloudEnabled) return null;
  if (friends === null) return <Text style={ui.muted}>Loading friends…</Text>;
  if (friends.length === 0) return <Text style={ui.muted}>Add friends in the Feed tab to tag them in workouts.</Text>;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
      {friends.map((f) => {
        const on = value.some((t) => t.id === f.id);
        return (
          <Chip
            key={f.id}
            label={`${on ? '✓ ' : '+ '}${f.display_name}`}
            active={on}
            onPress={() => onChange(on ? value.filter((t) => t.id !== f.id) : [...value, { id: f.id, name: f.display_name }])}
          />
        );
      })}
    </View>
  );
}
