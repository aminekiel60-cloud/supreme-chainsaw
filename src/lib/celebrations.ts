/**
 * Decides when to celebrate: the moment today's habits cross 60% (locked in),
 * reach 100% (perfect day), or you reach a new level. Never on app start,
 * only when you get there.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CelebrationKind } from '@/components/Celebration';
import { todayKey } from '@/store/dates';
import { LOCKED_IN_THRESHOLD, dayProgress } from '@/store/logic';
import { levelInfo, totalXp } from '@/store/progress';
import type { AppState, Settings } from '@/store/types';
import { haptics } from './haptics';

type SettingsDispatch = (a: { type: 'setSettings'; settings: Settings }) => void;

export function useCelebrations(state: AppState, active: boolean, dispatch: SettingsDispatch) {
  const [kind, setKind] = useState<CelebrationKind | null>(null);
  const [level, setLevel] = useState(1);
  const today = todayKey();
  const progress = dayProgress(state, today);
  const currentLevel = levelInfo(totalXp(state)).level;
  const previous = useRef<{ day: string; progress: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    const prev = previous.current;
    previous.current = { day: today, progress };

    // A new level beats every other celebration.
    if (currentLevel > state.settings.seenLevel) {
      dispatch({ type: 'setSettings', settings: { ...state.settings, seenLevel: currentLevel } });
      // seenLevel 0 = first run (or data from an older version): just remember, don't celebrate.
      if (state.settings.seenLevel > 0) {
        setLevel(currentLevel);
        setKind('levelUp');
        haptics.success();
        return;
      }
    }

    if (!prev || prev.day !== today) return; // first look today: just remember
    if (prev.progress < 1 && progress >= 1) {
      setKind('perfect');
      haptics.success();
    } else if (prev.progress < LOCKED_IN_THRESHOLD && progress >= LOCKED_IN_THRESHOLD) {
      setKind('lockedIn');
      haptics.success();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, today, progress, currentLevel]);

  const clear = useCallback(() => setKind(null), []);
  return { kind, level, clear };
}
