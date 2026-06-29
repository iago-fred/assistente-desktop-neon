/* ============================================
   BalaoDialogo — Speech bubble component
   Displays conversational text from the webhook
   with typing animation and tone indicators.
   Closes when clicking outside.
   ============================================ */

import { useEffect, useState, useRef } from "react";
import "./BalaoDialogo.css";

export interface Fala {
  texto: string;
  tom?: "neutro" | "animado" | "triste" | "sarcastico" | "curioso";
}

interface BalaoDialogoProps {
  /** Array of speech lines to display */
  falas: Fala[];
  /** Whether the webhook request is loading */
  carregando: boolean;
  /** Error message, if any */
  erro?: string;
  /** Callback when the bubble is dismissed */
  onFechar: () => void;
  /** Current visible line index */
  linhaAtual: number;
  /** Callback to advance to next line */
  onAvancar: () => void;
}

const ICONES_TOM: Record<string, string> = {
  neutro: "💬",
  animado: "✨",
  triste: "💔",
  sarcastico: "😏",
  curioso: "🤔",
};

export function BalaoDialogo({
  falas,
  carregando,
  erro,
  onFechar,
  linhaAtual,
  onAvancar,
}: BalaoDialogoProps) {
  const balaoRef = useRef<HTMLDivElement>(null);
  const [digitando, setDigitando] = useState("");
  const [indiceChar, setIndiceChar] = useState(0);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (balaoRef.current && !balaoRef.current.contains(e.target as Node)) {
        onFechar();
      }
    }

    // Delay adding listener to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onFechar]);

  // Typing animation effect
  useEffect(() => {
    if (carregando || erro || falas.length === 0 || linhaAtual >= falas.length) {
      setDigitando("");
      setIndiceChar(0);
      return;
    }

    const texto = falas[linhaAtual].texto;
    if (indiceChar >= texto.length) return;

    const timer = setTimeout(() => {
      setDigitando(texto.slice(0, indiceChar + 1));
      setIndiceChar((prev) => prev + 1);
    }, 25); // ~40 chars per second

    return () => clearTimeout(timer);
  }, [carregando, falas, linhaAtual, indiceChar, erro]);

  // Reset typing when advancing lines
  useEffect(() => {
    setDigitando("");
    setIndiceChar(0);
  }, [linhaAtual, falas]);

  const falaAtual = falas[linhaAtual];
  const isTypingComplete = falaAtual && indiceChar >= falaAtual.texto.length;
  const isUltimaFala = linhaAtual >= falas.length - 1;

  return (
    <div className="balao-container" ref={balaoRef}>
      <div className="balao-triangulo" />

      <div className="balao-conteudo">
        {/* Loading state */}
        {carregando && (
          <div className="balao-loading">
            <span className="balao-dot">.</span>
            <span className="balao-dot">.</span>
            <span className="balao-dot">.</span>
            <span className="balao-loading-text">Conectando...</span>
          </div>
        )}

        {/* Error state */}
        {erro && !carregando && (
          <div className="balao-erro">
            <span className="balao-erro-icone">⚠️</span>
            <span>{erro}</span>
          </div>
        )}

        {/* Speech content */}
        {!carregando && !erro && falaAtual && (
          <div className="balao-fala">
            {falaAtual.tom && falaAtual.tom !== "neutro" && (
              <span
                className="balao-tom"
                title={`Tom: ${falaAtual.tom}`}
              >
                {ICONES_TOM[falaAtual.tom] || "💬"}
              </span>
            )}
            <p className="balao-texto">
              {digitando}
              {!isTypingComplete && (
                <span className="balao-cursor">|</span>
              )}
              {isTypingComplete && !isUltimaFala && (
                <span className="balao-clique" onClick={onAvancar}>
                  {" "}
                  → clique para continuar
                </span>
              )}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!carregando && !erro && (falas.length === 0 || linhaAtual >= falas.length) && (
          <div className="balao-fala">
            <p className="balao-texto balao-texto-vazio">...</p>
          </div>
        )}

        {/* Progress dots */}
        {falas.length > 1 && (
          <div className="balao-progresso">
            {falas.map((_, i) => (
              <span
                key={i}
                className={`balao-ponto ${i === linhaAtual ? "balao-ponto-ativo" : ""} ${i < linhaAtual ? "balao-ponto-lido" : ""}`}
              />
            ))}
          </div>
        )}

        {/* Close button */}
        <button
          className="balao-fechar"
          onClick={onFechar}
          aria-label="Fechar balão"
          title="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
