/** A club's "logo": its initials on a lime tile. */
import { Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export const membersText = (n: number) => (n === 1 ? '1 member' : `${n} members`);

export function ClubBadge({ name, size = 46 }: { name: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Colors.background, fontWeight: '900', fontSize: size * 0.36 }}>{letters}</Text>
    </View>
  );
}
