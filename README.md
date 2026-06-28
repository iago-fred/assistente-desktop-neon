# 👻 Assistente Desktop Neon

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Windows](https://img.shields.io/badge/plataforma-Windows%2010%2F11-blue)
![Tauri](https://img.shields.io/badge/Tauri-v2-purple)
![License](https://img.shields.io/badge/licen%C3%A7a-MIT-green)

> **Um fantasma azul tatuado que vive na sua área de trabalho.**

O **Assistente Desktop Neon** é um assistente virtual em overlay para Windows — uma personagem interativa que flutua sobre todas as janelas, reage a cliques e arrastos, e se comunica através de um balão de diálogo inteligente que se reposiciona automaticamente conforme sua localização na tela.

Inspirado nos clássicos *Desktop Pets* (Clippy, Neko, Bonzi Buddy), mas repensado para o século XXI: moderno, leve, bonito e útil.

---

## 📋 Índice

- [👻 Assistente Desktop Neon](#-assistente-desktop-neon)
  - [📋 Índice](#-índice)
  - [🎯 O Problema \& Nossa Solução](#-o-problema--nossa-solução)
  - [🏗️ Arquitetura](#️-arquitetura)
  - [🧱 Stack Tecnológica](#-stack-tecnológica)
  - [📁 Estrutura de Pastas](#-estrutura-de-pastas)
  - [🧩 Componentes Principais](#-componentes-principais)
  - [🔄 Fluxo de Interação](#-fluxo-de-interação)
  - [🎯 Sistema de Quadrantes](#-sistema-de-quadrantes)
  - [🔌 Webhook de Integração com Agentes](#-webhook-de-integração-com-agentes)
  - [📅 Roadmap](#-roadmap)
  - [⚙️ Configuração Tauri](#️-configuração-tauri)
  - [🚀 Pré-requisitos e Instalação](#-pré-requisitos-e-instalação)
  - [💡 Licença](#-licença)
  - [🤝 Contribuição](#-contribuição)
  - [👥 Créditos](#-créditos)

---

## 🎯 O Problema & Nossa Solução

Assistentes digitais hoje ou vivem dentro de um navegador (ChatGPT Web, Gemini) ou ocupam metade da tela com interfaces pesadas (Cortana, Assistants incorporados). Não existe um assistente que:

- **Esteja sempre visível** sem atrapalhar
- **Seja leve** (não consuma 200MB+ de RAM como um Electron)
- **Tenha personalidade** — não é só um chatbot genérico
- **Seja divertido de interagir** — clicar, arrastar, ver animações

A **Neon** resolve isso sendo um overlay de ~150x150px que consome ~10-30MB de RAM, reage a mouse como um bichinho virtual, e expande um balão de diálogo contextual quando você clica nela.

> "É o Clippy que a gente merecia, não o que a Microsoft nos deu."

---

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                       DESKTOP WINDOWS                            │
│                                                                   │
│    ┌────────────────────────────────────────────────────────┐    │
│    │              Tauri Window (Overlay Layer)               │    │
│    │                                                        │    │
│    │  ┌──────────────────────────────────────────────────┐  │    │
│    │  │          Frontend React (WebView2)               │  │    │
│    │  │                                                    │  │    │
│    │  │  ┌──────────┐    ┌────────────────┐              │  │    │
│    │  │  │ Personagem │    │  Balão Dialogo │              │  │    │
│    │  │  │ (Lottie)   │    │  (React State) │              │  │    │
│    │  │  └──────────┘    └────────────────┘              │  │    │
│    │  │                                                    │  │    │
│    │  │  ┌──────────────────────────────────────────┐    │  │    │
│    │  │  │   Gerenciador de Quadrantes              │    │  │    │
│    │  │  │   (lógica CSS + appWindow.setPosition)   │    │  │    │
│    │  │  └──────────────────────────────────────────┘    │  │    │
│    │  │                                                    │  │    │
│    │  │  ┌──────────────────────────────────────────┐    │  │    │
│    │  │  │   Hooks React                             │    │  │    │
│    │  │  │   useDrag | usePosition                   │    │  │    │
│    │  │  └──────────────────────────────────────────┘    │  │    │
│    │  └──────────────────────────────────────────────────┘  │    │
│    │                                                        │    │
│    │  ┌──────────────────────────────────────────────────┐  │    │
│    │  │         Backend Rust (Tauri Commands)            │  │    │
│    │  │                                                    │  │    │
│    │  │  ┌────────────────┐  ┌──────────────────────┐    │  │    │
│    │  │  │  main.rs        │  │  tray.rs              │    │  │    │
│    │  │  │  - window setup │  │  - system tray icon   │    │  │    │
│    │  │  │  - commands     │  │  - menu: show/hide    │    │  │    │
│    │  │  └────────────────┘  │  - menu: quit          │    │  │    │
│    │  │                       └──────────────────────┘    │    │    │
│    │  └──────────────────────────────────────────────────┘  │    │
│    └────────────────────────────────────────────────────────┘    │
│                                                                   │
│    ┌──────────────────────────────────────────────────────────┐  │
│    │  Comunicação Frontend ↔ Backend                          │  │
│    │                                                          │  │
│    │  @tauri-apps/api (invoke, event)                         │  │
│    │  ──────────────── Tauri IPC Bridge ────────────────────  │  │
│    │  startDragging() → appWindow.start_dragging()            │  │
│    │  setPosition(x,y) → appWindow.set_position()             │  │
│    │  resize(w,h) → appWindow.set_size()                      │  │
│    └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Fluxo de Comunicação

1. **Evento de mouse** no React → detecta clique vs arraste (delta 5px)
2. Se **arraste** → `invoke('start_dragging')` → Tauri Rust gerencia o drag nativo
3. Se **clique** → detecta quadrante via `useQuadrante` → ajusta CSS + opcionalmente `appWindow.setPosition()`
4. **Lottie** roda no React com `@lottiefiles/react-lottie-player`, estados gerenciados por state machine

---

## 🧱 Stack Tecnológica

| Camada | Tecnologia | Por quê? |
|--------|-----------|----------|
| **UI/Frontend** | React 19 + Vite + TypeScript | Estados reativos, tipagem forte, HMR no desenvolvimento |
| **Desktop Wrapper** | Tauri v2 | Binary ~3MB (vs ~150MB Electron), WebView2 nativo |
| **Backend Nativo** | Rust | Comandos de sistema, manipulação de janela, performance |
| **Animações** | dotLottie (Lottie JSON) | Leve, 60fps, escalável sem perder qualidade |
| **Build** | Tauri CLI | Gera .exe / .msi nativo para Windows |
| **Versionamento** | Git + GitHub | [github.com/iago-fred](https://github.com/iago-fred) |

### Por que Tauri e não Electron?

| Característica | Tauri | Electron |
|---------------|-------|----------|
| 🗜️ Tamanho do binary | ~3 MB | ~150 MB |
| 🧠 Consumo de RAM | ~10-30 MB | ~100-200 MB |
| ⚡ Performance | Nativo (Rust) | JavaScript bridge |
| 🔐 Segurança | Sandbox por design | Menos restrito |
| 🪟 WebView | WebView2 (nativo Windows) | Chromium empacotado |

> O WebView2 já vem incluso no **Windows 11** e nas atualizações recentes do **Windows 10** — sem instalação extra.

---

## 📁 Estrutura de Pastas

```
assistente-desktop-neon/
│
├── src/                               # 🔹 Frontend React + TypeScript
│   ├── App.tsx                        # Componente raiz — orquestra tudo
│   ├── main.tsx                       # Entry point Vite — monta o React no DOM
│   │
│   ├── styles/
│   │   └── global.css                 # Reset CSS, fundo transparente, anti-seleção
│   │
│   ├── components/
│   │   ├── Personagem/                # 👻 O fantasma em si
│   │   │   ├── Personagem.tsx         # Player Lottie + handlers de mouse
│   │   │   ├── Personagem.css         # Estilo do personagem (sombra, brilho)
│   │   │   └── estados.ts             # Enum de estados (idle, hover, drag, talking, hidden)
│   │   │
│   │   ├── BalaoDialogo/              # 💬 Bolha de fala
│   │   │   ├── BalaoDialogo.tsx       # Balão que expande com texto
│   │   │   └── BalaoDialogo.css       # Triângulo, borda, animação de entrada
│   │   │
│   │   └── Quadrante/
│   │       └── useQuadrante.ts        # Hook: detecta quadrante e retorna CSS dinâmico
│   │
│   ├── hooks/
│   │   ├── useDrag.ts                 # Hook: arraste com delta de 5px
│   │   └── usePosition.ts             # Hook: persistência de posição (localStorage)
│   │
│   ├── utils/
│   │   ├── quadrantes.ts              # Lógica pura: cálculo de quadrante + centro
│   │   └── animacoes.ts              # Gerenciamento de animações Lottie
│   │
│   └── assets/
│       └── animacoes/                 # Arquivos .lottie (dotLottie)
│           ├── idle.lottie            # Respirando, olhando ao redor
│           ├── hover.lottie           # Olhando pro cursor, atenta
│           ├── drag.lottie            # Sendo arrastada
│           └── talking.lottie         # Falando / animada
│
├── src-tauri/                         # 🔹 Backend Rust (Tauri)
│   ├── src/
│   │   ├── main.rs                    # Entry point Rust, setup da janela
│   │   ├── lib.rs                     # Comandos Tauri (start_dragging, set_position)
│   │   └── tray.rs                    # Ícone na bandeja do sistema
│   │
│   ├── Cargo.toml                     # Dependências Rust (tauri, serde, etc.)
│   ├── tauri.conf.json                # Config da janela + permissões
│   └── capabilities/
│       └── default.json               # Permissões de plugins Tauri
│
├── public/
│   └── tray-icon.png                  # Ícone da bandeja do sistema (16x16 / 32x32)
│
├── package.json                       # Dependências Node.js
├── tsconfig.json                      # Config TypeScript
├── vite.config.ts                     # Config Vite
└── README.md                          # 📄 Este arquivo
```

---

## 🧩 Componentes Principais

### 👻 `Personagem.tsx`

O coração da aplicação. Renderiza o player Lottie e gerencia os eventos de mouse.

```tsx
// Exemplo conceitual da estrutura
function Personagem() {
  const { estado, setEstado } = useEstado();
  const { onMouseDown, onMouseMove, onMouseUp } = useDrag(5); // delta 5px

  return (
    <div onMouseDown={onMouseDown}>
      <LottiePlayer
        src={`/animacoes/${estado}.lottie`}
        loop
        autoplay
      />
    </div>
  );
}
```

### 💬 `BalaoDialogo.tsx`

Expande quando o personagem é clicado. Usa `useQuadrante` para saber em qual direção crescer.

- **Comportamento inteligente:** Nunca corta fora da tela
- **Fechamento:** Clique fora do balão fecha
- **Transição:** Animação CSS de entrada/saída

### 📐 `useQuadrante.ts`

Hook que escuta a posição da janela e retorna:

```ts
{
  direcao: 'up-left' | 'up-right' | 'down-left' | 'down-right',
  flexStyle: { flexDirection, alignItems },
  precisaReposicionar: boolean, // true se expande para cima/esquerda
}
```

### 🖱️ `useDrag.ts`

Hook que implementa o **delta de 5px** para diferenciar clique de arraste. Expõe `isDragging` e coordenadas.

---

## 🔄 Fluxo de Interação

### Clique vs Arraste

```
        [MouseDown]
            │
            ▼
   Captura (X_inicial, Y_inicial)
            │
            ▼
        [MouseMove]
            │
            ▼
    Calcula Δ = distância percorrida
         ╱        ╲
        ╱          ╲
    Δ > 5px       Δ ≤ 5px
       │              │
       ▼              ▼
appWindow.      [MouseUp]
startDragging()    │
  (arrastar)       ▼
              Abre balão de
                diálogo
```

### Máquina de Estados

```
        ┌─────────┐
        │  HIDDEN │ ←──── Tray: "Mostrar"
        └────┬────┘
             │ Tray: "Mostrar"
             ▼
      ┌──────────┐
      │   IDLE   │ ──── 5s sem interação → animação idle
      └────┬─────┘
           │
      ┌────▼─────┐        ┌──────────┐
      │  HOVER   │ ←──────│   IDLE   │
      └────┬─────┘        └──────────┘
           │                    ▲
      ┌────▼─────┐        ┌────┴─────┐
      │   DRAG   │        │ TALKING  │
      └──────────┘        └──────────┘
                                │
                           clique fora
                                │
                                ▼
                            [IDLE]
```

| Estado | Gatilho | Animação | Aparência |
|--------|---------|----------|-----------|
| **Idle** | Nenhuma interação por 5s+ | Respiração suave, olha ao redor | Relaxada, piscando |
| **Hover** | Mouse sobre o personagem | Olha pro cursor, inclina a cabeça | Atenta, curiosa |
| **Drag** | Mouse segurando + Δ > 5px | Segue o cursor, braços pra frente | "Wheee!" |
| **Talking** | Clique (Δ ≤ 5px) | Gesticulando, balão visível | Animada, falante |
| **Hidden** | Comando ou tray | Desaparece | Invisível |

### Transições

- **Idle → Hover:** `onMouseEnter` → troca animação instantaneamente
- **Hover → Drag:** `onMouseDown` + movimento → `startDragging()`
- **Hover → Talking:** `onMouseUp` sem movimento significativo → expande balão
- **Talking → Idle:** Clique fora do balão → animação de recolher → idle
- **Qualquer → Hidden:** Evento do tray → `appWindow.hide()`

---

## 🎯 Sistema de Quadrantes

Quando o assistente é clicado, a janela precisa **expandir** para acomodar o balão de diálogo. Se ela estiver no canto inferior direito da tela e o balão crescer pra baixo, ele corta fora do monitor.

A solução é dividir a tela em **4 quadrantes** e expandir o balão **na direção oposta** ao canto:

| Quadrante | Região | Direção da Expansão | CSS Flexbox | Reposiciona? |
|-----------|--------|-------------------|-------------|:---:|
| **Canto Inferior Direito** | X > centro e Y > centro | ⬆️ Cima + ⬅️ Esquerda | `column-reverse` + `flex-end` | ✅ Sim |
| **Canto Inferior Esquerdo** | X < centro e Y > centro | ⬆️ Cima + ➡️ Direita | `column-reverse` + `flex-start` | ✅ Sim |
| **Canto Superior Direito** | X > centro e Y < centro | ⬇️ Baixo + ⬅️ Esquerda | `column` + `flex-end` | ❌ Não |
| **Canto Superior Esquerdo** | X < centro e Y < centro | ⬇️ Baixo + ➡️ Direita | `column` + `flex-start` | ❌ Não |

### ⚠️ Desafio: Ancoragem Top-Left do Windows

O Windows ancora janelas pelo **canto superior esquerdo**. Se a Neon estiver no canto inferior direito e o balão crescer para **cima e para a esquerda**, apenas aumentar o `width` e `height` fará a janela crescer **para baixo e para a direita** — gerando um **pulo visual** horrível.

**Solução:** Quando `precisaReposicionar === true`, o hook `useQuadrante` dispara simultaneamente:

```ts
// Conceito: ajusta posição nativa enquanto expande CSS
appWindow.setPosition(
  x_atual - (largura_balão - largura_personagem),
  y_atual - (altura_balão - altura_personagem)
);
appWindow.setSize(largura_balão, altura_balão);
```

Isso faz a janela parecer que cresceu **para cima** mesmo com a ancoragem Top-Left do Windows.

---

## 🔌 Webhook de Integração com Agentes

O Assistente Desktop não vive isolado — ele precisa se comunicar com o ecossistema de agentes do OpenClaw que roda no VPS. O **webhook central** é a ponte entre o desktop e os agentes.

### Conceito

Um servidor webhook leve (roda no mesmo VPS que hospeda os agentes) que:

- **Recebe** requisições HTTP POST dos aplicativos desktop (Neon, Emily, etc.)
- **Identifica** qual agente deve processar a requisição (via header ou payload)
- **Roteia** a mensagem pro agente correto no OpenClaw via `sessions_send`
- **Retorna** a resposta processada pro app desktop

### Fluxo de Comunicação

```
┌──────────────────┐     POST /webhook/message      ┌────────────────────┐
│   Desktop App    │  ──────────────────────────▶   │   Webhook Server   │
│  (Neon overlay)  │                                │  (VPS, Node.js)    │
│  (Emily desktop) │  ◀──────────────────────────   │                    │
│  (outros apps)   │       Resposta JSON            │  ┌──────────────┐  │
└──────────────────┘                                │  │ sessions_send│  │
                                                    │  │   OpenClaw   │  │
                                                    │  └──────┬───────┘  │
                                                    └─────────┼──────────┘
                                                              │
                                                              ▼
                                                  ┌────────────────────┐
                                                  │   OpenClaw Agents  │
                                                  │                    │
                                                  │  👻 Neon (Iago)    │
                                                  │  🌸 Emily (Jéssica)│
                                                  │  🤖 Oliver (Dev)   │
                                                  └────────────────────┘
```

### Como funciona

1. O app desktop (ex: Neon no Windows do Iago) envia um `POST` pro webhook
2. O payload contém a identificação do agente e a ação desejada:

```json
{
  "agent": "neon",
  "action": "talk",
  "message": "Bom dia! O que temos hoje?",
  "metadata": {
    "source": "desktop-windows",
    "position": { "x": 120, "y": 540 }
  }
}
```

3. O webhook identifica o agente e encaminha via `sessions_send` do OpenClaw
4. O agente processa e a resposta é retornada pro app desktop

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/webhook/message` | Enviar mensagem pra um agente específico |
| `POST` | `/webhook/event` | Notificar evento (ex: "usuário clicou 5x", "abriu o balão") |
| `GET` | `/webhook/status` | Status dos agentes (online/offline/ocupado) |
| `POST` | `/webhook/register` | Registrar um novo agente ou cliente desktop |

### Exemplo de payload por endpoint

**POST /webhook/event**
```json
{
  "agent": "neon",
  "event": "user_interaction",
  "data": {
    "type": "click",
    "count": 42,
    "since": "2026-06-29T10:00:00Z"
  }
}
```

**GET /webhook/status**
```json
{
  "agents": {
    "neon": { "status": "online", "last_seen": "2026-06-29T14:32:00Z", "device": "desktop" },
    "emily": { "status": "online", "last_seen": "2026-06-29T14:30:00Z" },
    "oliver": { "status": "online", "last_seen": "2026-06-29T14:31:00Z" }
  }
}
```

### Agentes Planejados

| Agente | Dono | Canal Principal | Função |
|--------|------|----------------|--------|
| 👻 **Neon** | Iago | Telegram (`@Neon_IF_bot`) | Assistente pessoal — a personagem do desktop |
| 🌸 **Emily** | Jéssica | Telegram (futuramente) | Assistente pessoal da Jéssica |
| 🤖 **Oliver** | Iago | Webchat interno | Dev-ops e execução de código |

### Tecnologia Sugerida

| Opção | Prós | Contras |
|-------|------|---------|
| **Express/Fastify** (Node.js, no VPS) | Latência mínima, mesmo processo que os agentes | Consome recurso do VPS |
| **Vercel/Cloudflare Workers** (serverless) | Desacoplado, zero manutenção de infra | Latência de cold start, limite de execução |

> **Recomendação inicial:** Servidor Express pequeno rodando no VPS junto com o OpenClaw. Futuramente, se houver necessidade de escalar, migrar pra serverless.

### Futuro

- **Múltiplos dispositivos por agente** — ex: Neon no desktop + no celular, mesma conta
- **Autenticação via API key** — segurança nas chamadas
- **Logs centralizados de interação** — histórico de mensagens entre agentes e apps
- **Broadcast entre agentes** — um agente pode mandar mensagem pra outro via webhook
- **Fila de mensagens** — se o agente estiver ocupado, a mensagem entra em fila

---

## 📅 Roadmap

### 🟢 Fase 1 — MVP (Overlay + Interação Básica)

*Estimativa: 1-2 semanas*

- [x] Projeto configurado com Tauri v2 + React + Vite + TypeScript
- [ ] Janela transparente flutuante (`alwaysOnTop`, `skipTaskbar`, `decorations: false`)
- [ ] Personagem com animação **idle** (Lottie)
- [ ] Arraste pela tela (`startDragging` com delta 5px)
- [ ] Clique → balão de diálogo com sistema de quadrantes
- [ ] Fechar balão ao clicar fora
- [ ] Ícone na bandeja do sistema (mostrar, esconder, sair)

### 🟡 Fase 2 — Personalidade + Inteligência

*Estimativa: 2-3 semanas*

- [ ] Múltiplos estados de animação (idle, hover, drag, talking)
- [ ] Transições suaves entre estados
- [ ] Falas contextualizadas (hora do dia, clima, "bom dia", etc.)
- [ ] Persistência de posição entre reinícios (`config.json`)
- [ ] Evitar sobreposição com a barra de tarefas

### 🟠 Fase 3 — Integrações

*Estimativa: 3-4 semanas*

- [ ] API externa (Neon Cloud — backend que hospeda a assistente original)
- [ ] **TTS** — voz da Neon via edge-tts ou biblioteca nativa
- [ ] **STT** — comandos de voz via Whisper
- [ ] Atalhos globais (`Ctrl+Shift+N` para chamar/esconder)
- [ ] Integração com calendário e lembretes

### 🔴 Fase 4 — Polimento

*Estimativa: 2-3 semanas*

- [ ] Múltiplos temas de cor
- [ ] Configurações visuais (tamanho, opacidade)
- [ ] Auto-update (Tauri updater)
- [ ] Suporte a múltiplos monitores
- [ ] Animações de transição mais elaboradas

---

## ⚙️ Configuração Tauri

```json
{
  "app": {
    "windows": [
      {
        "title": "Neon",
        "width": 150,
        "height": 150,
        "minWidth": 150,
        "minHeight": 150,
        "alwaysOnTop": true,
        "transparent": true,
        "decorations": false,
        "skipTaskbar": true,
        "resizable": false,
        "focus": false,
        "center": false,
        "visible": true
      }
    ]
  }
}
```

### O que cada flag faz:

| Flag | Valor | Efeito |
|------|-------|--------|
| `alwaysOnTop` | `true` | Janela sempre acima de todas (DWM) |
| `transparent` | `true` | Fundo HTML transparente — só o personagem aparece |
| `decorations` | `false` | Remove barra de título, bordas e botões |
| `skipTaskbar` | `true` | Não aparece na barra de tarefas |
| `focus` | `false` | **Nunca** rouba o foco do usuário |
| `resizable` | `false` | Tamanho fixo (salvo quando expande o balão) |

---

## 🚀 Pré-requisitos e Instalação

### Dependências

| Ferramenta | Versão Mínima | Como Instalar |
|-----------|--------------|---------------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) |
| **Rust** | 1.70+ | `winget install Rustup` ou [rustup.rs](https://rustup.rs/) |
| **Tauri CLI** | v2 | `npm install -g @tauri-apps/cli` |
| **WebView2** | Incluso no Win11 | Já vem no sistema |
| **Git** | Qualquer | `winget install Git.Git` |

### Verificação rápida

```bash
node --version      # v18+
npm --version       # v9+
rustc --version     # 1.70+
cargo --version     # 1.70+
npx tauri --version # v2+
```

### Instalação e execução

```bash
# Clone o repositório
git clone https://github.com/iago-fred/assistente-desktop-neon.git
cd assistente-desktop-neon

# Instale dependências do frontend
npm install

# Execute em modo desenvolvimento
npx tauri dev
```

O comando `tauri dev` vai:
1. Iniciar o servidor Vite (HMR no frontend)
2. Compilar o backend Rust
3. Abrir a janela overlay da Neon

### Build para produção

```bash
npx tauri build
```

O instalador `.msi` (ou `.exe`) será gerado em `src-tauri/target/release/bundle/`.

---

## 🧠 Desafios Técnicos Conhecidos

### 1. Ancoragem Top-Left do Windows ⚡

**Problema:** O Windows ancora toda janela pelo canto superior esquerdo. Expandir para cima/esquerda sem reposicionar causa um pulo visual.

**Solução:** Ao detectar expansão para cima/esquerda (quadrantes inferiores), disparar `appWindow.setPosition()` simultaneamente ao resize.

### 2. DPI Scaling 🖥️

**Problema:** Em monitores HiDPI (4K, Retina), coordenadas de tela podem vir em pixels físicos vs lógicos, bagunçando o posicionamento.

**Solução:** Usar `appWindow.scaleFactor()` do Tauri para converter entre sistemas de coordenadas.

### 3. Múltiplos Monitores 🖥️🖥️

**Problema:** O quadrante precisa ser calculado baseado no monitor **atual**, não no primário.

**Solução:** Usar `window.screenLeft`/`screenTop` (ou o Tauri `availableMonitors()`) para detectar em qual monitor a janela está e calcular os quadrantes em relação àquele monitor.

### 4. Perda de Foco 🔒

**Problema:** A janela overlay nunca pode roubar o foco do usuário enquanto ele digita ou joga.

**Solução:** `focus: false` + eventos de mouse que não ativam a janela. Toda interação deve ser passiva.

### 5. Animação Perene 🔄

**Problema:** Animações complexas (GIF, MP4) pesam GPU/CPU.

**Solução:** dotLottie (JSON compacto, ~10-30KB por animação, 60fps com aceleração de hardware).

---

## 💡 Licença

Este projeto está licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes.

Resumo: você pode usar, copiar, modificar, mergear, publicar, distribuir, sublicenciar e/ou vender cópias do software, desde que mantenha o aviso de copyright original.

---

## 🤝 Contribuição

Este é um projeto pessoal do Iago, mas contribuições são bem-vindas!

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feat/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feat/nova-funcionalidade`
5. Abra um Pull Request

### Diretrizes

- Siga o padrão de commits [Conventional Commits](https://www.conventionalcommits.org/)
- Mantenha o código tipado (TypeScript estrito)
- Teste no Windows antes de abrir PR
- Se for adicionar animações Lottie, mantenha sob 50KB cada

---

## 👥 Créditos

- **Iago Frederick Cardoso** ([@iago-fred](https://github.com/iago-fred)) — Criador do projeto, dono do repositório e mentor da ideia original ☕
- **Neon 👻** — Assistente personagem que orquestrou a especificação completa do projeto e garantiu que a identidade visual e personalidade fossem fiéis ao conceito original
- **Oliver 🤖** — Agente dev-ops responsável pela engenharia de software, implementação do código e manutenção do repositório

> *"Um fantasma não precisa de pernas quando pode flutuar sobre suas janelas."* — Neon, provavelmente.

---

<p align="center">
  Feito com 💙 por <a href="https://github.com/iago-fred">Iago</a> • 🎧 Pop Punk • ☕ Café • 👻 Neon
</p>
