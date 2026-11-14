/**
 * A tappable body, front and back. Each muscle is its own shape: tap one to
 * select it. Colours can show how many sets each muscle got this week.
 * Shapes are drawn for the right half of the body and mirrored for the left.
 */
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import type { MuscleGroup } from '@/store/types';

export type Side = 'front' | 'back';

type Part = { muscle: MuscleGroup; d: string; mirror?: boolean };

/** Mirror an SVG path across the body's centre line (x = 100). */
function mirror(d: string) {
  // Paths here only use absolute M/L/Q/C/Z commands with x,y pairs.
  return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${200 - Number(x)} ${y}`);
}

// Body outline pieces (not tappable).
const SILHOUETTE = [
  'M84 50 L116 50 Q140 56 148 70 Q156 92 156 120 Q160 150 162 176 L152 178 Q146 150 142 126 L140 160 Q144 176 142 196 Q140 260 132 300 Q134 340 128 384 L108 384 Q110 330 104 300 Q102 250 100 214 Q98 250 96 300 Q90 330 92 384 L72 384 Q66 340 68 300 Q60 260 58 196 Q56 176 60 160 L58 126 Q54 150 48 178 L38 176 Q40 150 44 120 Q44 92 52 70 Q60 56 84 50 Z',
];

const FRONT: Part[] = [
  // shoulders (front delts)
  { muscle: 'shoulders', d: 'M72 60 Q56 62 50 76 Q48 90 52 98 Q58 94 62 86 Q68 72 78 66 Z', mirror: true },
  // chest
  { muscle: 'chest', d: 'M98 66 L80 66 Q66 74 64 90 Q66 102 78 106 Q92 108 98 102 Z', mirror: true },
  // biceps
  { muscle: 'biceps', d: 'M52 100 Q46 112 46 128 Q50 136 56 134 Q60 120 60 104 Z', mirror: true },
  // abs (one shape for the centre)
  { muscle: 'core', d: 'M90 110 L110 110 Q112 140 110 168 Q100 176 90 168 Q88 140 90 110 Z' },
  // obliques
  { muscle: 'core', d: 'M86 112 Q74 118 70 134 Q70 156 76 170 L86 168 Q84 140 86 112 Z', mirror: true },
  // quads
  { muscle: 'quads', d: 'M68 192 Q62 222 66 252 Q72 278 84 282 Q94 276 96 250 Q98 222 96 204 Q84 194 68 192 Z', mirror: true },
  // front of the lower leg (counts as calves)
  { muscle: 'calves', d: 'M70 300 Q66 324 70 352 L82 354 Q88 326 86 300 Z', mirror: true },
];

const BACK: Part[] = [
  // traps
  { muscle: 'back', d: 'M100 52 Q86 56 74 64 Q88 70 96 92 L100 100 L104 92 Q112 70 126 64 Q114 56 100 52 Z' },
  // rear delts
  { muscle: 'shoulders', d: 'M72 62 Q56 64 50 78 Q48 92 52 98 Q60 92 64 82 Z', mirror: true },
  // lats
  { muscle: 'back', d: 'M76 70 Q66 82 66 104 Q70 128 80 140 L96 136 Q96 108 92 92 Q86 76 76 70 Z', mirror: true },
  // lower back
  { muscle: 'back', d: 'M88 140 L112 140 Q114 156 112 170 L88 170 Q86 156 88 140 Z' },
  // triceps
  { muscle: 'triceps', d: 'M52 100 Q46 112 46 128 Q50 136 56 134 Q60 120 60 104 Z', mirror: true },
  // glutes
  { muscle: 'glutes', d: 'M100 174 Q84 172 72 180 Q66 196 72 208 Q86 214 100 206 Z', mirror: true },
  // hamstrings
  { muscle: 'hamstrings', d: 'M68 214 Q62 240 66 268 Q72 284 84 284 Q94 274 96 248 Q98 226 94 214 Q82 218 68 214 Z', mirror: true },
  // calves
  { muscle: 'calves', d: 'M68 296 Q62 316 66 340 Q72 352 80 350 Q88 334 86 300 Z', mirror: true },
];

/** Lime gets brighter with more sets: 0 sets is grey, 10+ sets is full lime. */
export function heatColor(sets: number) {
  if (sets <= 0) return '#33362f';
  const t = Math.min(1, sets / 12);
  const a = 0.25 + t * 0.75;
  return `rgba(163, 255, 63, ${a.toFixed(2)})`;
}

export function BodyMap({
  side,
  selected,
  onSelect,
  fill,
  width = 240,
}: {
  side: Side;
  selected: MuscleGroup | null;
  onSelect: (m: MuscleGroup) => void;
  /** Colour per muscle (for the weekly heat map); grey when missing */
  fill?: (m: MuscleGroup) => string;
  width?: number;
}) {
  const parts = side === 'front' ? FRONT : BACK;
  const shapes = parts.flatMap((p) => (p.mirror ? [p, { ...p, d: mirror(p.d) }] : [p]));

  return (
    <Svg width={width} height={width * 2} viewBox="0 0 200 400">
      {/* head, neck, hands, feet */}
      <Circle cx={100} cy={28} r={18} fill="#262826" />
      <Rect x={92} y={42} width={16} height={12} rx={4} fill="#262826" />
      {SILHOUETTE.map((d, i) => (
        <Path key={i} d={d} fill="#1f211e" stroke="#2f322c" strokeWidth={1.5} />
      ))}
      <G>
        {shapes.map((p, i) => {
          const isSel = selected === p.muscle;
          return (
            <Path
              key={`${side}-${i}`}
              d={p.d}
              fill={isSel ? Colors.lime : fill ? fill(p.muscle) : '#33362f'}
              stroke={isSel ? '#ffffff' : '#111111'}
              strokeWidth={isSel ? 1.5 : 1}
              onPress={() => onSelect(p.muscle)}
            />
          );
        })}
      </G>
      {side === 'front' && (
        <G pointerEvents="none">
          <Path d="M100 112 L100 170 M91 130 L109 130 M90 150 L110 150" stroke="#111111" strokeWidth={1.2} />
        </G>
      )}
      {side === 'back' && (
        <G pointerEvents="none">
          <Path d="M100 100 L100 170 M100 176 L100 206" stroke="#111111" strokeWidth={1.2} />
        </G>
      )}
    </Svg>
  );
}
