/** Small line chart (SVG) for progress over time: weight, reps, body weight. */
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { styles as ui } from './ui';

export type ChartPoint = { label: string; value: number };

export function LineChart({
  points,
  height = 140,
  unit = '',
  color = Colors.lime,
  trend,
}: {
  points: ChartPoint[];
  height?: number;
  unit?: string;
  color?: string;
  /** A smoothed line drawn on top (same length as points), e.g. a 7-day average */
  trend?: number[];
}) {
  const width = 320;
  const pad = { top: 14, right: 12, bottom: 24, left: 12 };
  if (points.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={ui.muted}>No data yet</Text>
      </View>
    );
  }
  const values = [...points.map((p) => p.value), ...(trend ?? [])];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.1);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const x = (i: number) => (points.length === 1 ? width / 2 : pad.left + (i / (points.length - 1)) * (width - pad.left - pad.right));
  const y = (v: number) => pad.top + (1 - (v - lo) / (hi - lo)) * (height - pad.top - pad.bottom);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${height - pad.bottom} L${x(0).toFixed(1)} ${height - pad.bottom} Z`;
  const last = points[points.length - 1];
  const first = points[0];
  const showLabels = points.length > 1 ? [0, points.length - 1] : [0];

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1={pad.left} x2={width - pad.right} y1={pad.top + f * (height - pad.top - pad.bottom)} y2={pad.top + f * (height - pad.top - pad.bottom)} stroke={Colors.border} strokeWidth={1} />
        ))}
        {points.length > 1 && <Path d={area} fill="url(#area)" />}
        <Path d={line} stroke={color} strokeWidth={trend ? 1.5 : 3} strokeOpacity={trend ? 0.6 : 1} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {trend && trend.length === points.length && points.length > 1 && (
          <Path
            d={trend.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')}
            stroke={Colors.lime}
            strokeWidth={3}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map((p, i) => (
          <Circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 5 : 3} fill={i === points.length - 1 ? color : Colors.background} stroke={color} strokeWidth={2} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -18, paddingHorizontal: 4 }}>
        <Text style={[ui.muted, { fontSize: 11 }]}>
          {first.label}: {first.value}
          {unit}
        </Text>
        {showLabels.length > 1 && (
          <Text style={[ui.muted, { fontSize: 11, color: color }]}>
            {last.label}: {last.value}
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}
