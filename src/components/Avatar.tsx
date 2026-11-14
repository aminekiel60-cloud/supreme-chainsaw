/**
 * Round profile picture with initials as fallback. The border colour shows
 * the level: it changes every 10 levels (lime, bronze, silver, gold,
 * diamond, and a glowing purple legend ring from level 50).
 */
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export const LEVEL_TIERS = [
  { from: 50, name: 'Legend', color: '#B98CFF', glow: true },
  { from: 40, name: 'Diamond', color: '#4FD1FF', glow: false },
  { from: 30, name: 'Gold', color: '#FFC83D', glow: false },
  { from: 20, name: 'Silver', color: '#D7DEE6', glow: false },
  { from: 10, name: 'Bronze', color: '#D08B4F', glow: false },
  { from: 1, name: 'Lime', color: Colors.lime, glow: false },
];

export const levelTier = (level: number) => LEVEL_TIERS.find((t) => level >= t.from) ?? LEVEL_TIERS[LEVEL_TIERS.length - 1];

export function Avatar({
  name,
  url,
  size = 40,
  level,
  ringLevel,
  highlight,
}: {
  name: string;
  url?: string | null;
  size?: number;
  /** Shows a level chip and colours the border */
  level?: number;
  /** Colours the border by level without the chip */
  ringLevel?: number;
  highlight?: boolean;
}) {
  const tierLevel = ringLevel ?? level;
  const tier = tierLevel !== undefined ? levelTier(tierLevel) : null;
  const border = tier ? tier.color : highlight ? Colors.lime : null;
  const width = size >= 60 ? 3 : 2;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          s.circle,
          { width: size, height: size, borderRadius: size / 2 },
          border !== null && { borderColor: border, borderWidth: width },
          tier?.glow && { boxShadow: `0 0 ${Math.round(size / 4)}px ${tier.color}` },
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
        <View style={[s.level, { minWidth: size * 0.5 }, tier && { backgroundColor: tier.color }]}>
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
