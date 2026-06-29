/* ============================================
   usePosition — Window position persistence
   Saves and restores the window position from
   a local JSON config file using Tauri fs plugin.
   Falls back to localStorage during dev in browser.
   ============================================ */

import { useRef, useCallback } from "react";
import { loadPosition, savePosition } from "@/utils/config";

interface PositionState {
  x: number;
  y: number;
}

/**
 * Hook that provides position save/load and auto-saves.
 */
export function usePosition() {
  const savedRef = useRef<PositionState | null>(null);

  const load = useCallback(async (): Promise<PositionState | null> => {
    const pos = await loadPosition();
    if (pos) savedRef.current = pos;
    return pos;
  }, []);

  const persist = useCallback(async (x: number, y: number) => {
    savedRef.current = { x, y };
    await savePosition(x, y);
  }, []);

  return {
    savedPosition: savedRef.current,
    load,
    persist,
  } as const;
}
