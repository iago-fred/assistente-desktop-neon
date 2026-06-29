/* ============================================
   Personagem — Neon character component
   Renders the SVG-based ghost character with
   CSS animations for idle, hover, drag, talking.
   ============================================ */

import React from "react";
import { EstadoAnimacao } from "@/utils/animacoes";
import "./Personagem.css";

interface PersonagemProps {
  estado: EstadoAnimacao;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function Personagem({
  estado,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}: PersonagemProps) {
  const isHidden = estado === "hidden";

  return (
    <div
      className={`personagem-wrapper estado-${estado} ${isHidden ? "personagem-hidden" : ""}`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="img"
      aria-label="Neon — assistente virtual"
    >
      <svg
        className="personagem-svg"
        viewBox="0 0 120 150"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Glow filter */}
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Radial gradient for body */}
          <radialGradient id="corpo-grad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#8be9fd" />
            <stop offset="60%" stopColor="#6bcef0" />
            <stop offset="100%" stopColor="#4a9fc4" />
          </radialGradient>

          {/* Eye glow */}
          <radialGradient id="olho-brilho" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#e0f7ff" />
            <stop offset="100%" stopColor="#b0e0ff" />
          </radialGradient>
        </defs>

        {/* ── Ghost body ────────────────────── */}
        <g filter="url(#neon-glow)" className="personagem-corpo">
          {/* Main ghost shape */}
          <path
            d={
              "M 20 80 " +
              "C 20 30, 100 30, 100 80 " +
              "L 100 130 " +
              "C 90 120, 80 130, 70 120 " +
              "C 60 110, 50 130, 40 120 " +
              "C 30 110, 20 130, 20 130 " +
              "Z"
            }
            fill="url(#corpo-grad)"
            opacity="0.92"
          />

          {/* Ghost outline glow */}
          <path
            d={
              "M 20 80 " +
              "C 20 30, 100 30, 100 80 " +
              "L 100 130 " +
              "C 90 120, 80 130, 70 120 " +
              "C 60 110, 50 130, 40 120 " +
              "C 30 110, 20 130, 20 130 " +
              "Z"
            }
            fill="none"
            stroke="#a8e6ff"
            strokeWidth="1.5"
            opacity="0.4"
          />
        </g>

        {/* ── Beanie (black touca) ──────────── */}
        <g className="personagem-touca">
          <path
            d={
              "M 18 45 " +
              "C 18 25, 30 15, 60 15 " +
              "C 90 15, 102 25, 102 45 " +
              "C 102 50, 100 55, 95 58 " +
              "L 25 58 " +
              "C 20 55, 18 50, 18 45 Z"
            }
            fill="#1a1a2e"
          />
          {/* Beanie rim */}
          <rect x="18" y="50" width="84" height="8" rx="4" fill="#16213e" />
          {/* Pompom */}
          <circle cx="60" cy="18" r="6" fill="#e94560" />
        </g>

        {/* ── Headphones ────────────────────── */}
        <g className="personagem-fones" opacity="0.85">
          {/* Band */}
          <path
            d="M 20 50 C 20 20, 100 20, 100 50"
            fill="none"
            stroke="#2d2d5e"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Left earcup */}
          <rect x="12" y="44" width="12" height="18" rx="4" fill="#2d2d5e" />
          {/* Right earcup */}
          <rect x="97" y="44" width="12" height="18" rx="4" fill="#2d2d5e" />
          {/* Ear glow */}
          <rect x="14" y="46" width="8" height="14" rx="3" fill="#e94560" opacity="0.3" />
          <rect x="99" y="46" width="8" height="14" rx="3" fill="#e94560" opacity="0.3" />
        </g>

        {/* ── Eyes ──────────────────────────── */}
        <g className="personagem-olhos">
          {/* Left eye */}
          <ellipse cx="38" cy="65" rx="10" ry="11" fill="#0a0a1a" />
          <ellipse cx="38" cy="64" rx="7" ry="8" fill="url(#olho-brilho)" />
          <circle cx="36" cy="62" r="3" fill="#ffffff" opacity="0.9" />

          {/* Right eye */}
          <ellipse cx="82" cy="65" rx="10" ry="11" fill="#0a0a1a" />
          <ellipse cx="82" cy="64" rx="7" ry="8" fill="url(#olho-brilho)" />
          <circle cx="80" cy="62" r="3" fill="#ffffff" opacity="0.9" />
        </g>

        {/* ── Blush (bochechas) ─────────────── */}
        <ellipse cx="28" cy="78" rx="6" ry="3" fill="#ff8fa3" opacity="0.25" />
        <ellipse cx="92" cy="78" rx="6" ry="3" fill="#ff8fa3" opacity="0.25" />

        {/* ── Tattoos ───────────────────────── */}
        <g className="personagem-tatuagens" opacity="0.6">
          {/* Spider web (left side) */}
          <path
            d="M 22 88 L 14 100 M 26 90 L 20 104 M 30 92 L 28 106"
            stroke="#7eb8d8"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <path
            d="M 14 100 Q 18 94 22 88"
            fill="none"
            stroke="#7eb8d8"
            strokeWidth="0.6"
            opacity="0.5"
          />
          <path
            d="M 20 104 Q 24 96 26 90"
            fill="none"
            stroke="#7eb8d8"
            strokeWidth="0.6"
            opacity="0.5"
          />
          <path
            d="M 28 106 Q 30 98 30 92"
            fill="none"
            stroke="#7eb8d8"
            strokeWidth="0.6"
            opacity="0.5"
          />

          {/* Broken heart (right side) */}
          <path
            d="M 90 90 L 94 95 L 98 90"
            fill="none"
            stroke="#e94560"
            strokeWidth="1.2"
            opacity="0.6"
          />
          <path
            d="M 90 90 C 86 86, 94 84, 94 90"
            fill="none"
            stroke="#e94560"
            strokeWidth="1"
            opacity="0.4"
          />
          <path
            d="M 98 90 C 102 86, 94 84, 94 90"
            fill="none"
            stroke="#e94560"
            strokeWidth="1"
            opacity="0.4"
          />
        </g>

        {/* ── Circuit lines (cyberpunk bg) ──── */}
        <g className="personagem-circuitos" opacity="0.15">
          <path
            d="M 10 135 L 30 135 L 40 120"
            fill="none"
            stroke="#a8e6ff"
            strokeWidth="1"
          />
          <circle cx="40" cy="120" r="1.5" fill="#a8e6ff" />
          <path
            d="M 110 135 L 90 135 L 80 120"
            fill="none"
            stroke="#a8e6ff"
            strokeWidth="1"
          />
          <circle cx="80" cy="120" r="1.5" fill="#a8e6ff" />
        </g>
      </svg>
    </div>
  );
}
