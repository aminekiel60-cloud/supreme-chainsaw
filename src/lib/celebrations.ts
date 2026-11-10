/**
 * Decides when to celebrate: the moment today's habits cross 60% (locked in)
 * or reach 100% (perfect day). Never on app start, only when you get there.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CelebrationKind } from '@/components/Celebration';
import { todayKey } from '@/store/dates';
import { LOCKED_IN_THRESHOLD, dayProgress } from '@/store/logic';
import type { AppState } from '@/store/types';
import { haptics } from './haptics';

export function useCelebrations(state: AppState, active: boolean) {
  const [kind, setKind] = useState<CelebrationKind | null>(null);
  const today = todayKey();
  const progress = dayProgress(state, today);
  const previous = useRef<{ day: string; progress: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    const prev = previous.current;
    previous.current = { day: today, progress };
    if (!prev || prev.day !== today) return; // first look today: just remember
    if (prev.progress < 1 && progress >= 1) {
      setKind('perfect');
      haptics.success();
    } else if (prev.progress < LOCKED_IN_THRESHOLD && progress >= LOCKED_IN_THRESHOLD) {
      setKind('lockedIn');
      haptics.success();
    }
  }, [active, today, progress]);

  const clear = useCallback(() => setKind(null), []);
  return { kind, clear };
}
