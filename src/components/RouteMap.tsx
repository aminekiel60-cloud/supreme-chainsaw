/** A GPS route drawn as a lime line (no map tiles needed), with start and finish dots. */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors, Radius } from '@/constants/theme';

export function RouteMap({ route, height = 220, style }: { route: [number, number][]; height?: number; style?: StyleProp<ViewStyle> }) {
  const width = 340;
  const pad = 18;
  if (route.length < 2) {
    return <View style={[{ height, borderRadius: Radius.md, backgroundColor: Colors.cardRaised }, style]} />;
  }
  // Flat projection: fine for the few km of a run. Longitude shrinks with latitude.
  const lat0 = (route[0][0] * Math.PI) / 180;
  const pts = route.map(([lat, lng]) => [lng * Math.cos(lat0), -lat]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1e-6;
  const spanY = Math.max(...ys) - minY || 1e-6;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  const xy = pts.map(([x, y]) => [offX + (x - minX) * scale, offY + (y - minY) * scale]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [sx, sy] = xy[0];
  const [ex, ey] = xy[xy.length - 1];

  return (
    <View style={[{ height, borderRadius: Radius.md, backgroundColor: '#151A10', overflow: 'hidden' }, style]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={d} stroke="rgba(163,255,63,0.25)" strokeWidth={10} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Path d={d} stroke={Colors.lime} strokeWidth={4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={sx} cy={sy} r={6} fill={Colors.background} stroke={Colors.lime} strokeWidth={3} />
        <Circle cx={ex} cy={ey} r={7} fill={Colors.lime} />
      </Svg>
    </View>
  );
}

/** Distance in metres between two GPS points. */
export function metersBetween(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
