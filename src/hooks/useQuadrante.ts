/* ============================================
   useQuadrante — Hook that detects screen quadrant
   and provides dynamic styles for the bubble layout.
   ============================================ */

import { useState, useCallback, useEffect } from "react";
import { detectarQuadrante, QuadranteResult, estiloQuadrante } from "@/utils/quadrantes";

interface UseQuadranteOptions {
  /** Window X position */
  winX: number;
  /** Window Y position */
  winY: number;
  /** Window width */
  winW: number;
  /** Window height */
  winH: number;
}

interface UseQuadranteReturn {
  /** Current quadrant result */
  quadrante: QuadranteResult;
  /** CSS style for the container */
  containerStyle: React.CSSProperties;
  /** Recalculate quadrant */
  recalcular: () => void;
}

/**
 * Hook that tracks the window position on screen and
 * calculates which quadrant it's in for bubble positioning.
 */
export function useQuadrante({
  winX,
  winY,
  winW,
  winH,
}: UseQuadranteOptions): UseQuadranteReturn {
  const getScreenSize = useCallback(() => {
    return {
      screenW: window.screen.availWidth,
      screenH: window.screen.availHeight,
    };
  }, []);

  const calcular = useCallback(() => {
    const { screenW, screenH } = getScreenSize();
    return detectarQuadrante(winX, winY, winW, winH, screenW, screenH);
  }, [winX, winY, winW, winH, getScreenSize]);

  const [quadrante, setQuadrante] = useState<QuadranteResult>(calcular);

  useEffect(() => {
    setQuadrante(calcular());
  }, [calcular]);

  const recalcular = useCallback(() => {
    setQuadrante(calcular());
  }, [calcular]);

  return {
    quadrante,
    containerStyle: estiloQuadrante(quadrante),
    recalcular,
  };
}
