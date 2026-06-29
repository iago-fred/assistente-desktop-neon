/* ============================================
   Quadrantes — Screen quadrant detection
   Divides the monitor into 4 quadrants so the
   speech bubble expands in the right direction.
   ============================================ */

export interface QuadranteResult {
  /** Display name: "bottom-right", "bottom-left", "top-right", "top-left" */
  nome: string;
  /** CSS flex-direction for the bubble container */
  flexDirection: "column" | "column-reverse";
  /** CSS align-items for the bubble container */
  alignItems: "flex-start" | "flex-end";
  /** Whether the window must be repositioned (top/left anchor fix) */
  precisaReposicionar: boolean;
  /** Suggested offset adjustment for bubble pivot */
  offsetX: number;
  offsetY: number;
}

/**
 * Detect which screen quadrant a point is in, based on screen dimensions.
 *
 * @param winX - Window X position (px, left edge)
 * @param winY - Window Y position (px, top edge)
 * @param winW - Window width (px)
 * @param winH - Window height (px)
 * @param screenW - Screen/monitor width (px)
 * @param screenH - Screen/monitor height (px)
 */
export function detectarQuadrante(
  winX: number,
  winY: number,
  winW: number,
  winH: number,
  screenW: number,
  screenH: number,
): QuadranteResult {
  const centerX = screenW / 2;
  const centerY = screenH / 2;

  const janelaCenterX = winX + winW / 2;
  const janelaCenterY = winY + winH / 2;

  const isRight = janelaCenterX >= centerX;
  const isBottom = janelaCenterY >= centerY;

  // ── Bottom-right ─────────────────────────────
  if (isRight && isBottom) {
    return {
      nome: "bottom-right",
      flexDirection: "column-reverse",
      alignItems: "flex-end",
      precisaReposicionar: true,
      offsetX: -300,
      offsetY: -400,
    };
  }

  // ── Bottom-left ──────────────────────────────
  if (!isRight && isBottom) {
    return {
      nome: "bottom-left",
      flexDirection: "column-reverse",
      alignItems: "flex-start",
      precisaReposicionar: true,
      offsetX: 0,
      offsetY: -400,
    };
  }

  // ── Top-right ────────────────────────────────
  if (isRight && !isBottom) {
    return {
      nome: "top-right",
      flexDirection: "column",
      alignItems: "flex-end",
      precisaReposicionar: false,
      offsetX: -300,
      offsetY: 0,
    };
  }

  // ── Top-left ─────────────────────────────────
  return {
    nome: "top-left",
    flexDirection: "column",
    alignItems: "flex-start",
    precisaReposicionar: false,
    offsetX: 0,
    offsetY: 0,
  };
}

/**
 * Build a CSS style object from a quadrant result
 * for the container element.
 */
export function estiloQuadrante(q: QuadranteResult): React.CSSProperties {
  return {
    flexDirection: q.flexDirection,
    alignItems: q.alignItems,
  };
}
