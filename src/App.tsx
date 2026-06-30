/* ============================================
   App — Root component
   Orchestrates the Neon character, drag behavior,
   speech bubble overlay, and webhook communication.
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
const PERSONAGEM_W = 160;
const PERSONAGEM_H = 260;
const BALAO_W = 320;
const BALAO_H = 250;
const GAP = 8;
const WEBHOOK_URL = "http://100.125.136.29:3344/webhook/message";

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
  const idleTimerRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);

  // ── Quadrant ─────────────────────────
  const { containerStyle, recalcular } = useQuadrante({
    winX: winPos.x,
    winY: winPos.y,
    winW: PERSONAGEM_W,
    winH: PERSONAGEM_H,
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

  // ── Click handler (show bubble overlay) ─
  const handleClick = useCallback(() => {
    setEstado("talking");
    setBalaoAberto(true);
    recalcular();
    enviarMensagem();
    resetIdleTimer();
  }, [recalcular, enviarMensagem, resetIdleTimer]);

  // ── Drag handlers ────────────────────
  const handleDragStart = useCallback(() => {
    setEstado("drag");
    resetIdleTimer();
    // Start native Tauri window drag
    if (isTauri()) {
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        getCurrentWindow().startDragging().catch(() => {
          // ignore in browser dev / unsupported
        });
      });
    }
  }, [resetIdleTimer]);

  const handleDragEnd = useCallback(() => {
    setEstado("idle");
    // Sync position from Tauri after drag completes
    if (isTauri()) {
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        getCurrentWindow().outerPosition().then((p) => {
          setWinPos({ x: p.x, y: p.y });
        });
      });
    }
  }, []);

  const { onMouseDown, onMouseMove, onMouseUp } = useDrag({
    delta: 5,
    onClick: handleClick,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  });

  // ── Close bubble ─────────────────────
  const handleFecharBalao = useCallback(() => {
    setBalaoAberto(false);
    setFalas([]);
    setLinhaAtual(0);
    setErro(undefined);
    setEstado("idle");
  }, []);

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

  // ── Bubble overlay positioning ───────
  const bubbleStyle: React.CSSProperties = (() => {
    const flexDir = containerStyle.flexDirection ?? "column";
    const align = containerStyle.alignItems ?? "flex-start";

    // Top anchor: if column-reverse, bubble goes ABOVE the character
    const top =
      flexDir === "column-reverse" ? -(BALAO_H + GAP) : PERSONAGEM_H + GAP;

    // Horizontal anchor: if right-aligned, bubble sticks out to the left
    const left =
      align === "flex-end" ? PERSONAGEM_W - BALAO_W - GAP : 0;

    return {
      position: "absolute" as const,
      top,
      left: Math.max(left, 0),
    };
  })();

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
        position: "relative",
        width: PERSONAGEM_W,
        height: PERSONAGEM_H,
        overflow: "visible",
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Character */}
      <Personagem
        estado={estado}
        onMouseDown={onMouseDown}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Speech bubble overlay */}
      {balaoAberto && (
        <div style={bubbleStyle}>
          <BalaoDialogo
            falas={falas}
            carregando={carregando}
            erro={erro}
            onFechar={handleFecharBalao}
            linhaAtual={linhaAtual}
            onAvancar={handleAvancarFala}
          />
        </div>
      )}
    </div>
  );
}
