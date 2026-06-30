/* ============================================
   Base — Neon character visual (styled-components)
   From Iago's original design with Beanie, headphones,
   big eyes, tattoos, wave bottom, and glow effects.
   ============================================ */

import styled, { keyframes } from "styled-components";
import type { EstadoAnimacao } from "@/utils/animacoes";

// ── KEYFRAMES ──────────────────────────────

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
`;

const shadowScale = keyframes`
  0% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(0.8); opacity: 0.2; }
  100% { transform: scale(1); opacity: 0.4; }
`;

const blink = keyframes`
  0%, 45%, 55%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0); }
`;

const lookAround = keyframes`
  0%, 40%, 60%, 100% { transform: translate(0px, 0px); }
  10%, 30% { transform: translate(-5px, 1px); }
  70%, 90% { transform: translate(5px, 1px); }
`;

// ── STYLED COMPONENTS ──────────────────────

const Wrapper = styled.div<{ $animState: EstadoAnimacao }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 160px;
  height: 220px;

  ${({ $animState }) =>
    $animState === "talking"
      ? `animation: ${float} 1.2s ease-in-out infinite;`
      : $animState === "drag"
        ? `
      animation: none;
      transform: scale(0.97, 1.03);
    `
        : $animState === "hidden"
          ? `
      animation: none;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `
          : `
      animation: ${float} 3s ease-in-out infinite;
    `}

  background: #a6f6f8;
  border-radius: 80px 80px 0 0;
  filter: drop-shadow(0 0 8px rgba(86, 237, 240, 0.6))
    drop-shadow(0 0 20px rgba(86, 237, 240, 0.4));
`;

// ── ACESSÓRIOS (TOUCA E FONES) ─────────

const Beanie = styled.div`
  position: absolute;
  top: -18px;
  width: 154px;
  height: 75px;
  background: #24252a;
  border-radius: 80px 80px 15px 15px;
  box-shadow: inset 0 -8px 0 #18191c;
  z-index: 10;

  &::before {
    content: "";
    position: absolute;
    top: -12px;
    left: 20px;
    width: 100px;
    height: 40px;
    background: #24252a;
    border-radius: 50px 50px 0 0;
    z-index: -1;
  }
`;

const PatchSkull = styled.div`
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  background: #3a2a3a;
  border: 1px dashed #7a6a7a;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;

  &::before {
    content: "";
    width: 10px;
    height: 10px;
    background: #eeddee;
    border-radius: 50% 50% 40% 40%;
    position: absolute;
    top: 4px;
  }

  &::after {
    content: "";
    width: 6px;
    height: 5px;
    background: #eeddee;
    position: absolute;
    top: 12px;
    border-radius: 1px;
    box-shadow: -2px -6px 0 #3a2a3a, 2px -6px 0 #3a2a3a;
  }
`;

const HeadphonesArc = styled.div`
  position: absolute;
  top: -22px;
  width: 172px;
  height: 100px;
  border: 12px solid #3c244d;
  border-bottom: none;
  border-radius: 90px 90px 0 0;
  z-index: 11;
  pointer-events: none;
`;

const EarCupLeft = styled.div`
  position: absolute;
  top: 50px;
  left: -22px;
  width: 32px;
  height: 55px;
  background: radial-gradient(circle at center, #633687 40%, #2f1442 100%);
  border-radius: 24px 12px 12px 24px;
  z-index: 12;
  box-shadow: -3px 5px 10px rgba(0, 0, 0, 0.5);
`;

const EarCupRight = styled.div`
  position: absolute;
  top: 50px;
  right: -22px;
  width: 32px;
  height: 55px;
  background: radial-gradient(circle at center, #3c244d 40%, #1c0d26 100%);
  border-radius: 12px 24px 24px 12px;
  z-index: 12;
  box-shadow: 3px 5px 10px rgba(0, 0, 0, 0.5);
`;

// ── OLHOS ───────────────────────────────

const EyeContainer = styled.div<{ $animState: EstadoAnimacao }>`
  display: flex;
  margin-top: 75px;
  justify-content: space-between;
  width: 58%;
  z-index: 2;

  ${({ $animState }) =>
    $animState === "hover" &&
    `
    animation: ${lookAround} 3s ease-in-out infinite;
  `}
`;

const Eye = styled.div`
  width: 34px;
  height: 38px;
  background-color: #ffffff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  animation: ${blink} 4s linear infinite;
  transform-origin: center;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.3);
`;

const Iris = styled.div`
  width: 85%;
  height: 85%;
  background: radial-gradient(circle, #2de1e4 20%, #063947 80%, #02131a 100%);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${lookAround} 8s ease-in-out infinite;
`;

const Pupil = styled.div`
  width: 65%;
  height: 65%;
  background-color: #000000;
  border-radius: 50%;
  position: relative;
`;

const Highlight = styled.div`
  width: 40%;
  height: 40%;
  background-color: #ffffff;
  border-radius: 50%;
  position: absolute;
  top: 10%;
  left: 10%;
`;

// ── TATUAGENS ──────────────────────────

const TattooWeb = styled.div`
  position: absolute;
  top: 105px;
  left: 10px;
  width: 30px;
  height: 30px;
  opacity: 0.65;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: rotate(180deg);

  svg {
    width: 100%;
    height: 100%;
    stroke: #11363c;
    stroke-width: 1.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }
`;

const TattooHeartBroken = styled.div`
  position: absolute;
  top: 120px;
  right: 22px;
  width: 28px;
  height: 25px;
  opacity: 0.75;
  display: flex;
  justify-content: center;
  align-items: center;

  svg {
    width: 100%;
    height: 100%;
    fill: #11363c;
  }
`;

const TattooTextLost = styled.div`
  position: absolute;
  top: 145px;
  left: 14px;
  font-family: "Courier New", Courier, monospace;
  font-size: 11px;
  font-weight: 900;
  color: #11363c;
  opacity: 0.7;
  transform: rotate(-25deg);
  letter-spacing: 2px;
`;

const TattooMoon = styled.div`
  position: absolute;
  bottom: 50px;
  right: 12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-shadow: -6px 4px 0 0 #11363c;
  transform: rotate(-20deg);
  opacity: 0.7;
`;

const TattooTextNeverok = styled.div`
  position: absolute;
  bottom: 25px;
  right: 12px;
  font-family: "Impact", "Arial Black", sans-serif;
  font-size: 12px;
  color: #11363c;
  opacity: 0.75;
  letter-spacing: 1px;
`;

// ── BASE E SOMBRA ──────────────────────

const WaveContainer = styled.div`
  display: flex;
  position: absolute;
  bottom: -14px;
  left: 0;
  width: 100%;
`;

const Wave = styled.div`
  width: 40px;
  height: 25px;
  background-color: #a6f6f8;
  border-radius: 0 0 50% 50%;
`;

const Shadow = styled.div<{ $animState: EstadoAnimacao }>`
  width: 130px;
  height: 14px;
  background-color: #000000;
  border-radius: 50%;
  margin-top: 40px;
  opacity: 0.5;

  ${({ $animState }) =>
    $animState === "hidden"
      ? `
    animation: none;
    opacity: 0;
  `
      : `
    animation: ${shadowScale} 3s ease-in-out infinite;
  `}
`;

// ── COMPONENTE PRINCIPAL ───────────────

interface BaseProps {
  animState: EstadoAnimacao;
  className?: string;
}

export default function Base({ animState, className }: BaseProps) {
  return (
    <>
      <Wrapper $animState={animState} className={className}>
        {/* Acessórios Punk/Gótico */}
        <Beanie>
          <PatchSkull />
        </Beanie>
        <HeadphonesArc />
        <EarCupLeft />
        <EarCupRight />

        {/* Olhos */}
        <EyeContainer $animState={animState}>
          <Eye>
            <Iris>
              <Pupil>
                <Highlight />
              </Pupil>
            </Iris>
          </Eye>
          <Eye>
            <Iris>
              <Pupil>
                <Highlight />
              </Pupil>
            </Iris>
          </Eye>
        </EyeContainer>

        {/* Tatuagens */}
        <TattooWeb>
          <svg viewBox="0 0 100 100">
            <line x1="0" y1="0" x2="100" y2="100" />
            <line x1="0" y1="0" x2="100" y2="30" />
            <line x1="0" y1="0" x2="30" y2="100" />
            <path d="M 30,9  A 35,35 0 0,1 12,12" />
            <path d="M 12,12 A 35,35 0 0,1 9,30" />
            <path d="M 55,16 A 60,60 0 0,1 25,25" />
            <path d="M 25,25 A 60,60 0 0,1 16,55" />
            <path d="M 80,24 A 85,85 0 0,1 40,40" />
            <path d="M 40,40 A 85,85 0 0,1 24,80" />
          </svg>
        </TattooWeb>

        <TattooHeartBroken>
          <svg viewBox="0 0 24 24">
            <path d="M12,6 C11.3,3.8 8.8,2 6,2 C2.7,2 0,4.7 0,8 C0,13 6,18 12,22 L12,18 L10.5,16.5 L12.5,14.5 L10,12 L12,9 L11,6.5 Z" />
            <path d="M12,6 L13,6.5 L12,9 L14,12 L11.5,14.5 L13.5,16.5 L12,18 L12,22 C18,18 24,13 24,8 C24,4.7 21.3,2 18,2 C15.2,2 12.7,3.8 12,6 Z" />
          </svg>
        </TattooHeartBroken>

        <TattooTextLost>LOST</TattooTextLost>
        <TattooMoon />
        <TattooTextNeverok>NEVEROK</TattooTextNeverok>

        {/* Ondas do lençol */}
        <WaveContainer>
          <Wave />
          <Wave />
          <Wave />
          <Wave />
        </WaveContainer>
      </Wrapper>

      {/* Sombra */}
      <Shadow $animState={animState} />
    </>
  );
}
