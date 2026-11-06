import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';

/** The Locked in mark: a white "L" wrapped around a neon padlock. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="lock" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C8FF7A" />
          <Stop offset="1" stopColor={Colors.lime} />
        </LinearGradient>
      </Defs>
      {/* Shackle */}
      <Path
        d="M54 46 V31 A13 13 0 0 1 80 31 V46"
        stroke="#FFFFFF"
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
      />
      {/* Lock body */}
      <Rect x={42} y={42} width={48} height={40} rx={7} fill="url(#lock)" />
      {/* The "L" */}
      <Path
        d="M12 22 Q12 14 20 14 H28 Q36 14 36 22 V66 H70 L56 88 H20 Q12 88 12 80 Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

/** Logo mark + "Locked in" wordmark, as used in the app header. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      <Text style={[styles.word, { fontSize: size * 0.72 }]}>
        Locked <Text style={{ color: Colors.lime }}>in</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  word: { color: Colors.text, fontWeight: '800', letterSpacing: -0.5 },
});
