/* ============================================
   App — Root component
   Orchestrates the Neon character, drag behavior,
   speech bubble, and webhook communication.
   ============================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { Personagem } from "@/components/Personagem/Personagem";
import { BalaoDialogo, Fala } from "@/components/BalaoDialogo/BalaoDialogo";
import { useDrag } from "@/hooks/useDrag";
import { useQuadrante } from "@/hooks/useQuadrante";
import { EstadoAnimacao } from "@/utils/animacoes";
import { loadPosition, savePosition } from "@/utils/config";

interface WebhookResponse {
  success: boolean;
  falas?: Fala[];
  erro?: string;
}

// ── Config ───────────────────────────────
const PERSONAGEM_W = 120;
const PERSONAGEM_H = 150;
const BALAO_W = 320;
const BALAO_H = 250;
const WEBHOOK_URL = "http://100.125.136.29:3344/webhook/message";
const GAP = 8;

const IDLE_TIMEOUT_MS = 5000;

/** Whether Tauri runtime is available (vs browser dev) */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export default function App() {
  // ── State ────────────────────────────
  const [estado, setEstado] = useState<EstadoAnimacao>("idle");
  const [balaoAberto, setBalaoAberto] = useState(false);
  const [falas, setFalas] = useState<Fala[]>([]);
  const [linhaAtual, setLinhaAtual] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [winPos, setWinPos] = useState({ x: 100, y: 100 });
  const [windowSize, setWindowSize] = useState({
    w: PERSONAGEM_W,
    h: PERSONAGEM_H,
  });
  const idleTimerRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);

  // ── Quadrant ─────────────────────────
  const { containerStyle, recalcular } = useQuadrante({
    winX: winPos.x,
    winY: winPos.y,
    winW: windowSize.w,
    winH: windowSize.h,
  });

  // ── Load saved position ──────────────
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const tryLoad = async () => {
      if (isTauri()) {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const appWindow = getCurrentWindow();
          const pos = await appWindow.outerPosition();
          setWinPos({ x: pos.x, y: pos.y });
          return;
        } catch {
          // fallback to config file
        }
      }
      const saved = await loadPosition();
      if (saved) {
        setWinPos(saved);
      }
    };
    tryLoad();
  }, []);

  // ── Save position on change ──────────
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const timer = setTimeout(() => {
      savePosition(winPos.x, winPos.y);
    }, 500);
    return () => clearTimeout(timer);
  }, [winPos]);

  // ── Position sync with Tauri ─────────
  const updateWindowPosition = useCallback(async (x: number, y: number) => {
    setWinPos({ x, y });
    if (!isTauri()) return;
    try {
      const { getCurrentWindow, PhysicalPosition } = await import(
        "@tauri-apps/api/window"
      );
      const appWindow = getCurrentWindow();
      await appWindow.setPosition(new PhysicalPosition(x, y));
    } catch {
      // ignore
    }
  }, []);

  const updateWindowSize = useCallback(async (w: number, h: number) => {
    setWindowSize({ w, h });
    if (!isTauri()) return;
    try {
      const { getCurrentWindow, PhysicalSize } = await import(
        "@tauri-apps/api/window"
      );
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new PhysicalSize(w, h));
    } catch {
      // ignore
    }
  }, []);

  // ── Idle timer ───────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      setEstado("idle");
    }, IDLE_TIMEOUT_MS);
  }, []);

  // ── Webhook call ─────────────────────
  const enviarMensagem = useCallback(async () => {
    setCarregando(true);
    setErro(undefined);
    setFalas([]);
    setLinhaAtual(0);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: "neon",
          message: "Oi!",
          metadata: {
            source: "desktop-windows",
            position: winPos,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: WebhookResponse = await res.json();

      if (data.success && data.falas && data.falas.length > 0) {
        setFalas(data.falas);
        setLinhaAtual(0);
      } else if (data.erro) {
        setErro(data.erro);
      } else {
        setFalas([{ texto: "Oi! 🌟", tom: "animado" }]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setErro(`Sem conexão com a Neon ☁️\n(${msg})`);

      // Fallback: show a local greeting
      setFalas([{ texto: "Oi! Como posso ajudar? 💙", tom: "animado" }]);
    } finally {
      setCarregando(false);
    }
  }, [winPos]);

  // ── Click handler ────────────────────
  const handleClick = useCallback(() => {
    setEstado("talking");
    setBalaoAberto(true);
    recalcular();

    // Expand window for bubble
    const expandW = PERSONAGEM_W + BALAO_W + GAP;
    const expandH = Math.max(PERSONAGEM_H, BALAO_H);
    updateWindowSize(expandW, expandH);

    // If bottom-right/bottom-left, reposition
    const screenW = window.screen.availWidth;
    const screenH = window.screen.availHeight;
    const centerX = screenW / 2;
    const centerY = screenH / 2;
    const janelaCenterX = winPos.x + PERSONAGEM_W / 2;
    const janelaCenterY = winPos.y + PERSONAGEM_H / 2;

    if (janelaCenterX >= centerX && janelaCenterY >= centerY) {
      // Bottom-right: move window left+up
      updateWindowPosition(
        winPos.x - BALAO_W - GAP,
        winPos.y - BALAO_H + PERSONAGEM_H,
      );
    } else if (janelaCenterX < centerX && janelaCenterY >= centerY) {
      // Bottom-left: move window up
      updateWindowPosition(winPos.x, winPos.y - BALAO_H + PERSONAGEM_H);
    } else if (janelaCenterX >= centerX && janelaCenterY < centerY) {
      updateWindowPosition(winPos.x - BALAO_W - GAP, winPos.y);
    }

    enviarMensagem();
    resetIdleTimer();
  }, [
    recalcular,
    updateWindowSize,
    updateWindowPosition,
    winPos,
    enviarMensagem,
    resetIdleTimer,
  ]);

  // ── Drag handlers ────────────────────
  const handleDragStart = useCallback(() => {
    setEstado("drag");
    resetIdleTimer();
  }, [resetIdleTimer]);

  const handleDragEnd = useCallback(() => {
    setEstado("idle");
  }, []);

  const { onMouseDown, onMouseMove, onMouseUp } = useDrag({
    delta: 5,
    onClick: handleClick,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  });

  // ── Tauri drag region support ────────
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupDrag = async () => {
      if (!isTauri()) return;
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();

        const unlisten = await appWindow.onDragDropEvent((event) => {
          if (event.payload.type === "over") {
            setEstado("drag");
          } else if (
            event.payload.type === "drop" ||
            event.payload.type === "leave"
          ) {
            setEstado("idle");
            appWindow.outerPosition().then((p) => {
              setWinPos({ x: p.x, y: p.y });
            });
          }
        });

        cleanup = unlisten;
      } catch {
        // browser dev
      }
    };

    setupDrag();
    return () => {
      cleanup?.();
    };
  }, []);

  // ── Close bubble ─────────────────────
  const handleFecharBalao = useCallback(() => {
    setBalaoAberto(false);
    setFalas([]);
    setLinhaAtual(0);
    setErro(undefined);
    setEstado("idle");
    updateWindowSize(PERSONAGEM_W, PERSONAGEM_H);
  }, [updateWindowSize]);

  // ── Advance speech ───────────────────
  const handleAvancarFala = useCallback(() => {
    if (linhaAtual < falas.length - 1) {
      setLinhaAtual((prev) => prev + 1);
    } else {
      handleFecharBalao();
    }
  }, [linhaAtual, falas.length, handleFecharBalao]);

  // ── Hover ────────────────────────────
  const handleMouseEnter = useCallback(() => {
    if (estado === "idle") {
      setEstado("hover");
    }
  }, [estado]);

  const handleMouseLeave = useCallback(() => {
    if (estado === "hover") {
      setEstado("idle");
    }
  }, [estado]);

  // ── Cleanup idle timer ───────────────
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // ── Render ───────────────────────────
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        ...containerStyle,
        gap: GAP,
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Character */}
      <Personagem
        estado={estado}
        onMouseDown={onMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Speech bubble */}
      {balaoAberto && (
        <BalaoDialogo
          falas={falas}
          carregando={carregando}
          erro={erro}
          onFechar={handleFecharBalao}
          linhaAtual={linhaAtual}
          onAvancar={handleAvancarFala}
        />
      )}
    </div>
  );
}
