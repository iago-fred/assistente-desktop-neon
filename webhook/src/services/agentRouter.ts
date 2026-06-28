import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentConfig, AgentMap, AgentStatus } from "../types/index.js";

// ─── Configuração dos Agentes ───────────────────────────────────────

function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const AGENTS: AgentMap = {
  neon: {
    name: "Neon 👻",
    owner: "Iago",
    sessionKey: getEnv("NEON_SESSION_KEY", "agent:main:webhook-neon"),
    description: "Assistente pessoal do Iago",
  },
  emily: {
    name: "Emily 🌸",
    owner: "Jéssica",
    sessionKey: getEnv("EMILY_SESSION_KEY", "agent:main:webhook-emily"),
    description: "Assistente pessoal da Jéssica",
  },
  oliver: {
    name: "Oliver 🤖",
    owner: "Iago",
    sessionKey: getEnv("OLIVER_SESSION_KEY", "agent:main:webhook-oliver"),
    description: "Dev-ops engineer",
  },
};

// ─── Diretórios ─────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "..", "..", "logs");
const EVENT_LOG = join(LOG_DIR, "events.jsonl");
const QUEUE_FILE = join(LOG_DIR, "message_queue.jsonl");

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function appendJsonLine(filePath: string, data: Record<string, unknown>): void {
  try {
    ensureLogDir();
    writeFileSync(filePath, JSON.stringify(data) + "\n", { flag: "a" });
  } catch {
    // Silencia erro de escrita
  }
}

// ─── Validação ──────────────────────────────────────────────────────

export function validateAgent(agentId: string): AgentConfig | null {
  return AGENTS[agentId] ?? null;
}

// ─── Roteamento de Mensagens (Fire-and-Forget) ──────────────────────

/**
 * Enfileira uma mensagem para um agente.
 *
 * A mensagem é escrita em `logs/message_queue.jsonl` no formato JSON Lines.
 * Um script companion (worker) ou o próprio agente OpenClaw processa a fila
 * e encaminha a mensagem via sessions_send.
 *
 * Estratégia:
 *  1. Log do evento
 *  2. Escreve na fila de mensagens
 *  3. Retorna sucesso imediatamente (não bloqueia)
 */
export function queueMessageToAgent(
  agentId: string,
  message: string,
  metadata?: Record<string, unknown>,
): { success: boolean; output: string } {
  const agent = validateAgent(agentId);
  if (!agent) {
    return { success: false, output: `Agente '${agentId}' não encontrado` };
  }

  const timestamp = new Date().toISOString();

  // Log do evento
  appendJsonLine(EVENT_LOG, {
    type: "message",
    agent: agentId,
    message,
    metadata,
    timestamp,
  });

  // Enfileira a mensagem
  appendJsonLine(QUEUE_FILE, {
    agent: agentId,
    sessionKey: agent.sessionKey,
    message,
    metadata,
    timestamp,
    status: "queued",
  });

  return {
    success: true,
    output: `Mensagem enfileirada para ${agent.name}`,
  };
}

// ─── Roteamento Síncrono (sessão webhook-interna) ────────────

/**
 * Envia uma mensagem para a sessão interna do webhook e retorna a resposta.
 *
 * Executa `openclaw agent --session-key agent:main:webhook-internal --message <msg> --json`
 * e extrai a resposta do agente do JSON retornado.
 *
 * NÃO usa --deliver — a resposta fica contida no JSON, sem passar
 * por Telegram ou qualquer canal externo.
 *
 * ⚠️  Pode levar até 60s dependendo do modelo.
 */
export function routeMessageToAgent(
  agentId: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; output: string; response?: string }> {
  return new Promise((resolve) => {
    const agent = validateAgent(agentId);
    if (!agent) {
      resolve({ success: false, output: `Agente '${agentId}' não encontrado` });
      return;
    }

    // Log do evento
    appendJsonLine(EVENT_LOG, {
      type: "message",
      agent: agentId,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // Executa openclaw agent --json (SEM --deliver)
    const proc = spawn("openclaw", [
      "agent",
      "--session-key", agent.sessionKey,
      "--message", message,
      "--json",
    ], {
      timeout: 60_000,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) {
        // Tenta extrair a resposta do JSON
        try {
          const parsed = JSON.parse(stdout);
          const responseText = parsed?.result?.meta?.finalAssistantVisibleText
            || parsed?.result?.meta?.finalAssistantRawText;
          if (responseText) {
            resolve({ success: true, output: stdout.trim(), response: responseText });
          } else {
            resolve({ success: true, output: stdout.trim() });
          }
        } catch {
          resolve({ success: true, output: stdout.trim() });
        }
      } else if (code === 124 || code === 143) {
        resolve({ success: true, output: stdout.trim() || "(timeout)" });
      } else {
        resolve({ success: false, output: stderr.trim() || `exit code ${code}` });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: `Erro: ${err.message}` });
    });
  });
}

// ─── Eventos ────────────────────────────────────────────────────────

export function logEvent(
  agentId: string,
  event: string,
  data?: Record<string, unknown>,
): void {
  appendJsonLine(EVENT_LOG, {
    type: "event",
    agent: agentId,
    event,
    data,
    timestamp: new Date().toISOString(),
  });
}

// ─── Status dos Agentes ─────────────────────────────────────────────

export function getAgentsStatus(): Record<string, AgentStatus> {
  const now = new Date().toISOString();
  const statuses: Record<string, AgentStatus> = {};

  for (const [id, config] of Object.entries(AGENTS)) {
    statuses[id] = {
      status: "online",
      last_seen: now,
      description: config.description,
    };
  }

  return statuses;
}
