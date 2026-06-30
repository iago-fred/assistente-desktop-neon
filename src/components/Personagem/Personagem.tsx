/* ============================================
   Personagem — Neon character component
   Renders the styled-components Base character with
   state-driven animations and event handlers.
   ============================================ */

import React from "react";
import Base from "./Base";
import type { EstadoAnimacao } from "@/utils/animacoes";
import "./Personagem.css";

interface PersonagemProps {
  estado: EstadoAnimacao;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function Personagem({
  estado,
  onMouseDown,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PersonagemProps) {
  const isHidden = estado === "hidden";

  return (
    <div
      className={`personagem-wrapper estado-${estado} ${isHidden ? "personagem-hidden" : ""}`}
      data-tauri-drag-region
      onMouseDown={onMouseDown}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="img"
      aria-label="Neon — assistente virtual"
    >
      <Base animState={estado} />
    </div>
  );
}
