import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentConfig, AgentMap, AgentStatus } from "../types/index.js";

// ─── Configuração dos Agentes ───────────────────────────────────────

export const AGENTS: AgentMap = {
  neon: {
    name: "Neon 👻",
    owner: "Iago",
    sessionKey: "agent:main:main",
    description: "Assistente pessoal do Iago",
  },
  emily: {
    name: "Emily 🌸",
    owner: "Jéssica",
    sessionKey: "agent:emily:main",
    description: "Assistente pessoal da Jéssica",
  },
  oliver: {
    name: "Oliver 🤖",
    owner: "Iago",
    sessionKey: "agent:main:oliver",
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
