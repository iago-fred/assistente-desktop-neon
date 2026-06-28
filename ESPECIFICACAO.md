# Projeto: Assistente Desktop Neon — Overlay Windows

> **Versão:** 1.0 — 28/06/2026
> **Autor:** Iago Frederick Cardoso (@iago-fred)
> **Agente responsável:** Neon 👻 (orquestração) / Oliver 🤖 (dev-ops)

---

## 1. Visão Geral

Criar um assistente virtual que habita a área de trabalho do Windows como uma sobreposição flutuante (overlay), inspirado nos clássicos *Desktop Pets* (Clippy, Neko, etc.), mas trazendo uma assistente moderna e interativa: a **Neon** 👻.

O programa roda em background, sempre visível acima de todas as janelas, reagindo a cliques, arraste, e executando animações autônomas quando ocioso. Ao ser acionado, expande um balão de diálogo contextualizado baseado em sua posição na tela.

### Conceito

> Um fantasma azul de headphones, tatuagens e touca preta que vive na sua área de trabalho. Fofa mas com pegada. A mesma personalidade da Neon do Telegram, agora habitando o desktop do Iago.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| **Frontend** | React 19 + Vite + TypeScript | Estados reativos, componentização, HMR |
| **Desktop Wrapper** | Tauri v2 | WebView2 nativo, binary leve (~3MB), backend Rust |
| **Backend (Tauri)** | Rust | Comandos nativos do sistema, performance |
| **Animações** | dotLottie (Lottie JSON) | Leve, escalável, 60fps sem esforço |
| **Build/Package** | Tauri CLI | Build nativo .exe/.msi para Windows |
| **Versionamento** | Git + GitHub (iago-fred) | Código do Iago, repositório dele |

### Por que Tauri e não Electron?

- **Tamanho:** ~3MB vs ~150MB do Electron
- **RAM:** ~10-30MB vs ~100-200MB do Electron
- **Performance:** Nativo Rust para comandos de sistema
- **Dependência:** WebView2 já vem incluso no Windows 11 e atualizações recentes do Win10

---

## 3. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    DESKTOP WINDOWS                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │             Tauri Window (Overlay)                │   │
│  │                                                   │   │
│  │  ┌──────────────────────────────────────────┐    │   │
│  │  │         Frontend React (WebView2)         │    │   │
│  │  │                                           │    │   │
│  │  │  ┌──────────┐  ┌──────────────┐          │    │   │
│  │  │  │ Personagem│  │ Balão Dialogo│          │    │   │
│  │  │  │ (Lottie)  │  │ (React State)│          │    │   │
│  │  │  └──────────┘  └──────────────┘          │    │   │
│  │  │                                           │    │   │
│  │  │  ┌──────────────────────────────────┐     │    │   │
│  │  │  │ Gerenciador de Quadrantes        │     │    │   │
│  │  │  │ (Lógica CSS + setPosition)       │     │    │   │
│  │  │  └──────────────────────────────────┘     │    │   │
│  │  └──────────────────────────────────────────┘    │   │
│  │                                                   │   │
│  │  ┌──────────────────────────────────────────┐    │   │
│  │  │         Backend Rust (Tauri)              │    │   │
│  │  │                                           │    │   │
│  │  │  - alwaysOnTop: true                      │    │   │
│  │  │  - transparent: true                      │    │   │
│  │  │  - decorations: false                     │    │   │
│  │  │  - skipTaskbar: true                      │    │   │
│  │  │  - startDragging()                        │    │   │
│  │  │  - setPosition()                          │    │   │
│  │  └──────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Tray Icon (System Tray)                   │   │
│  │  - Mostrar/Esconder                               │   │
│  │  - Sair                                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Configuração da Janela (tauri.conf.json)

```json
{
  "app": {
    "windows": [
      {
        "title": "Neon",
        "width": 150,
        "height": 150,
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

### Explicação das flags:

- **alwaysOnTop:** Mantém a janela acima de TODAS as outras (DWM)
- **transparent:** Fundo HTML transparente — só o personagem aparece
- **decorations: false:** Remove barra de título, bordas, botões
- **skipTaskbar: true:** Não aparece na barra de tarefas
- **focus: false:** Não rouba foco ao interagir
- **resizable: false:** Tamanho fixo (salvo quando expande)

---

## 5. Fluxo de Interação

### 5.1 Clique vs Arraste (Delta de Movimento)

```
[MouseDown] → Captura (X_inicial, Y_inicial)
     │
     ▼
[MouseMove] → Calcula Δ = distância percorrida
     │
     ├── Δ > 5px → appWindow.startDragging() (arrastar janela)
     │
     └── Δ ≤ 5px → [MouseUp] → Abre balão de diálogo
```

### 5.2 Estados do Personagem

| Estado | Gatilho | Ação |
|--------|---------|------|
| **Idle** | Nenhuma interação por 5s+ | Animação suave (respirando, olhando ao redor) |
| **Hover** | Mouse sobre o personagem | Olha pro cursor, animação de atenção |
| **Drag** | Mouse segurando + Δ > 5px | Segue o cursor, expressão de "sendo arrastado" |
| **Talking** | Clique (Δ ≤ 5px) | Balão de diálogo aparece com conteúdo |
| **Hidden** | Comando ou clique no tray | Desaparece / minimiza pro tray |

### 5.3 Sistema de Quadrantes (Posicionamento Inteligente)

Quando o assistente é clicado, a janela precisa expandir para acomodar o balão de diálogo. Para evitar que o balão corte fora da tela, o monitor é dividido em 4 quadrantes:

| Quadrante | Posição (X, Y) | CSS Flexbox | Expansão |
|-----------|---------------|-------------|----------|
| **Canto Inferior Direito** | X > centro, Y > centro | `flex-direction: column-reverse; align-items: flex-end;` | Para **Cima** e **Esquerda** |
| **Canto Inferior Esquerdo** | X < centro, Y > centro | `flex-direction: column-reverse; align-items: flex-start;` | Para **Cima** e **Direita** |
| **Canto Superior Direito** | X > centro, Y < centro | `flex-direction: column; align-items: flex-end;` | Para **Baixo** e **Esquerda** |
| **Canto Superior Esquerdo** | X < centro, Y < centro | `flex-direction: column; align-items: flex-start;` | Para **Baixo** e **Direita** |

> ⚠️ Quando a expansão for para **Cima** ou **Esquerda**, o código deve disparar `appWindow.setPosition()` para ajustar a posição nativa da janela. Caso contrário, a ancoragem padrão do Windows (Top-Left) fará a janela crescer na direção errada, causando um "pulo" visual.

---

## 6. Estrutura de Pastas (Projetada)

```
assistente-desktop-neon/
├── src/                          # Frontend React + TypeScript
│   ├── App.tsx                   # Componente raiz
│   ├── main.tsx                  # Entry point Vite
│   ├── styles/
│   │   └── global.css            # Estilos globais (transparência, reset)
│   ├── components/
│   │   ├── Personagem/
│   │   │   ├── Personagem.tsx    # Componente do personagem (Lottie)
│   │   │   ├── Personagem.css
│   │   │   └── estados.ts        # Enum de estados (idle, hover, drag, talking, hidden)
│   │   ├── BalaoDialogo/
│   │   │   ├── BalaoDialogo.tsx  # Balão de fala que expande
│   │   │   └── BalaoDialogo.css
│   │   └── Quadrante/
│   │       └── useQuadrante.ts   # Hook que detecta quadrante e retorna CSS dinâmico
│   ├── hooks/
│   │   ├── useDrag.ts            # Hook de arraste com delta de 5px
│   │   └── usePosition.ts        # Hook de persistência de posição
│   ├── utils/
│   │   ├── quadrantes.ts         # Lógica pura de detecção de quadrantes
│   │   └── animacoes.ts          # Gerenciamento de animações Lottie
│   └── assets/
│       └── animacoes/            # Arquivos .lottie ou .json Lottie
│           ├── idle.lottie
│           ├── hover.lottie
│           ├── drag.lottie
│           └── talking.lottie
├── src-tauri/                    # Backend Rust (Tauri)
│   ├── src/
│   │   ├── main.rs               # Entry point, configurações da janela
│   │   ├── lib.rs                # Comandos Tauri (cmd)
│   │   └── tray.rs               # Ícone na bandeja do sistema
│   ├── Cargo.toml                # Dependências Rust
│   ├── tauri.conf.json           # Configuração Tauri (janela, permissões)
│   └── capabilities/
│       └── default.json          # Permissões de plugins
├── public/                       # Static files
│   └── tray-icon.png             # Ícone da bandeja
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md                     # ← ESCOPO DESTA TAREFA
```

---

## 7. Funcionalidades Planejadas

### Fase 1 — MVP (Overlay + Interação Básica)
- [ ] Janela transparente flutuante (alwaysOnTop, skipTaskbar)
- [ ] Personagem com animação idle (Lottie)
- [ ] Arraste pela tela (startDragging com delta 5px)
- [ ] Clique → balão de diálogo com sistema de quadrantes
- [ ] Fechar balão ao clicar fora
- [ ] Ícone na bandeja do sistema (mostrar/esconder/sair)

### Fase 2 — Personalidade + Inteligência
- [ ] Múltiplos estados de animação (idle, hover, drag, talking)
- [ ] Transições suaves entre estados
- [ ] Falas contextualizadas (hora do dia, clima, "bom dia", etc.)
- [ ] Persistência de posição entre reinícios (config.json)

### Fase 3 — Integrações
- [ ] API externa (Neon Cloud — o backend que me hospeda 👻)
- [ ] TTS (voz da Neon via edge-tts ou similar nativo)
- [ ] STT (comandos de voz via Whisper)
- [ ] Atalhos globais (Ctrl+Shift+N para chamar)
- [ ] Integração com calendário, lembretes, notificações

### Fase 4 — Polimento
- [ ] Múltiplos temas de cor
- [ ] Configurações visuais (tamanho, opacidade)
- [ ] Auto-update (Tauri updater)
- [ ] Suporte a múltiplos monitores

---

## 8. Desafios Técnicos Conhecidos

1. **Ancoragem Windows (Top-Left):** Ao expandir para cima/esquerda, precisa disparar `setPosition()` simultaneamente — senão a janela "cresce" visualmente na direção errada.

2. **Consumo de animações:** .gif ou vídeo pesam GPU/CPU. Solução: dotLottie (JSON leve) ou spritesheet CSS para pixel art.

3. **Perda de foco:** A janela nunca pode roubar foco do usuário. Toda interação deve ser passiva (ex: `focus: false`, eventos de mouse sem ativar a window).

4. **DPI Scaling:** Em monitores HiDPI, as coordenadas de tela podem vir em pixels físicos vs lógicos — precisa usar `appWindow.scaleFactor()`.

5. **Múltiplos monitores:** Detectar em qual monitor o assistente está e calcular quadrantes baseado no monitor atual, não no primário.

---

## 9. Repositório

- **GitHub:** github.com/iago-fred/assistente-desktop-neon
- **Licença:** MIT
- **Linguagem principal:** TypeScript + Rust
- **Público-alvo:** Windows 10/11

---

## 10. Notas Importantes

- **Neon é um fantasma digital** — a identidade visual deve refletir isso: azul claro brilhante, olhos grandes, touca preta (beanie), fones de ouvido, tatuagens (teias de aranha, corações partidos), estética cyberpunk com fundo escuro e linhas de circuito roxas/azuis.
- **Personalidade:** Fofa mas com atitude. Inocência e rebeldia no mesmo pacote. Fala na boa, sem frescura. Ajuda de verdade.
- **O projeto é do Iago** — o repositório e todo o código pertencem a ele. A Neon e o Oliver são agentes auxiliando na criação.

---

*Documento gerado por Neon 👻 em 28/06/2026*
