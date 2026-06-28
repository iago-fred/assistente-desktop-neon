import { spawn } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentConfig, AgentMap, AgentStatus } from "../types/index.js";

// ─── Configuração dos Agentes ───────────────────────────────────────

export const AGENTS: AgentMap = {
  neon: {
    name: "Neon",
    owner: "Iago",
    sessionKey: "agent:main:telegram:direct:8829697706",
    description: "Assistente pessoal do Iago",
  },
  emily: {
    name: "Emily",
    owner: "Jéssica",
    sessionKey: "agent:main:telegram:direct:1732942559",
    description: "Assistente pessoal da Jéssica",
  },
  oliver: {
    name: "Oliver",
    owner: "Iago",
    sessionKey: "agent:main:oliver",
    description: "Dev-ops engineer",
  },
};

// ─── Log de Eventos ─────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "..", "..", "logs");
const EVENT_LOG = join(LOG_DIR, "events.jsonl");

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logEventToFile(event: Record<string, unknown>): void {
  try {
    ensureLogDir();
    writeFileSync(EVENT_LOG, JSON.stringify(event) + "\n", { flag: "a" });
  } catch {
    // Silencia erro de escrita — não derruba o servidor por causa de log
  }
}

// ─── Roteamento de Mensagens ────────────────────────────────────────

/**
 * Valida se um agentId existe na configuração.
 */
export function validateAgent(agentId: string): AgentConfig | null {
  return AGENTS[agentId] ?? null;
}

/**
 * Envia uma mensagem para um agente via OpenClaw CLI.
 * Usa `openclaw agent --session-key <key> --message "<text>"`.
 */
export function routeMessageToAgent(
  agentId: string,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const agent = validateAgent(agentId);
    if (!agent) {
      resolve({ success: false, output: `Agente '${agentId}' não encontrado` });
      return;
    }

    // Log do evento independente do resultado
    logEventToFile({
      type: "message",
      agent: agentId,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // Tenta enviar via OpenClaw CLI
    const proc = spawn(
      "openclaw",
      [
        "agent",
        "--session-key",
        agent.sessionKey,
        "--message",
        message,
        "--json",
      ],
      {
        timeout: 30_000,
        env: { ...process.env, HOME: process.env.HOME },
      },
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        resolve({
          success: false,
          output: stderr.trim() || `Código de saída: ${code}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: `Erro ao executar OpenClaw CLI: ${err.message}`,
      });
    });
  });
}

/**
 * Registra um evento no log (sem encaminhar pra agente).
 */
export function logEvent(
  agentId: string,
  event: string,
  data?: Record<string, unknown>,
): void {
  const entry = {
    type: "event",
    agent: agentId,
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  logEventToFile(entry);
}

/**
 * Retorna o status atual de todos os agentes.
 */
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
