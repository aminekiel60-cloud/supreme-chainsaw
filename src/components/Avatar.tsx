/** Round profile picture with initials as fallback and an optional level chip. */
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function Avatar({
  name,
  url,
  size = 40,
  level,
  highlight,
}: {
  name: string;
  url?: string | null;
  size?: number;
  level?: number;
  highlight?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          s.circle,
          { width: size, height: size, borderRadius: size / 2 },
          highlight && { borderColor: Colors.lime, borderWidth: 2 },
        ]}>
        {url ? (
          <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
        ) : (
          <Text style={{ color: Colors.text, fontWeight: '800', fontSize: size * 0.38 }}>
            {name.trim().slice(0, 1).toUpperCase() || '?'}
          </Text>
        )}
      </View>
      {level !== undefined && (
        <View style={[s.level, { minWidth: size * 0.5 }]}>
          <Text style={s.levelText}>{level}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  circle: {
    backgroundColor: Colors.cardRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  level: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.lime,
    borderWidth: 2,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: { color: Colors.background, fontSize: 10, fontWeight: '900' },
});
