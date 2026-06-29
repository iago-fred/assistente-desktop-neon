/* ============================================
   Animações — Animation state machine
   Manages the Neon character's animation states
   and provides CSS class names for each state.
   ============================================ */

export type EstadoAnimacao =
  | "idle"
  | "hover"
  | "drag"
  | "talking"
  | "hidden";

export interface AnimacaoState {
  estado: EstadoAnimacao;
  cssClass: string;
  label: string;
}

const ANIMACOES: Record<EstadoAnimacao, AnimacaoState> = {
  idle: {
    estado: "idle",
    cssClass: "anim-idle",
    label: "Flutuando suavemente",
  },
  hover: {
    estado: "hover",
    cssClass: "anim-hover",
    label: "Olhando para você",
  },
  drag: {
    estado: "drag",
    cssClass: "anim-drag",
    label: "Sendo arrastada",
  },
  talking: {
    estado: "talking",
    cssClass: "anim-talking",
    label: "Falando...",
  },
  hidden: {
    estado: "hidden",
    cssClass: "anim-hidden",
    label: "Escondida",
  },
};

export function getAnimacao(estado: EstadoAnimacao): AnimacaoState {
  return ANIMACOES[estado];
}

export function getCSSClass(estado: EstadoAnimacao): string {
  return ANIMACOES[estado].cssClass;
}

/** Returns the list of all states for CSS generation */
export const TODOS_ESTADOS = Object.keys(ANIMACOES) as EstadoAnimacao[];
