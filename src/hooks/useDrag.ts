/* ============================================
   useDrag — Drag hook with 5px delta threshold
   Distinguishes click from drag and manages
   Tauri window dragging.
   ============================================ */

import { useCallback, useRef, useState } from "react";

interface UseDragOptions {
  /** Minimum pixel distance to consider it a drag (default: 5) */
  delta?: number;
  /** Callback when a click is detected (delta <= threshold) */
  onClick?: () => void;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: () => void;
}

interface UseDragReturn {
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Bind to onMouseDown of the draggable element */
  onMouseDown: (e: React.MouseEvent) => void;
  /** Bind to onMouseMove of the container */
  onMouseMove: (e: React.MouseEvent) => void;
  /** Bind to onMouseUp of the container */
  onMouseUp: (e: React.MouseEvent) => void;
}

export function useDrag(options: UseDragOptions = {}): UseDragReturn {
  const { delta = 5, onClick, onDragStart, onDragEnd } = options;

  const isDraggingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      startPosRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = false;
      setIsDragging(false);
    },
    [],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const start = startPosRef.current;
      if (!start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= delta && !isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDragging(true);
        onDragStart?.();
      }
    },
    [delta, onDragStart],
  );

  const onMouseUp = useCallback(
    (_e: React.MouseEvent) => {
      const wasDragging = isDraggingRef.current;

      if (!wasDragging) {
        onClick?.();
      } else {
        onDragEnd?.();
      }

      isDraggingRef.current = false;
      setIsDragging(false);
      startPosRef.current = null;
    },
    [onClick, onDragEnd],
  );

  return {
    isDragging,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
}
