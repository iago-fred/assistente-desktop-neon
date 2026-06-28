#!/usr/bin/env node

/**
 * relay-agent.js — Relay de mensagens do webhook para agentes OpenClaw
 *
 * Lê a fila de mensagens do webhook e encaminha cada uma para o agente
 * correto via `openclaw agent --session-key <key> --message <msg>`.
 *
 * ⚠️  As sessionKeys agora são INTERNAS (ex: agent:main:oliver) e NÃO
 *     apontam para o Telegram. As mensagens chegam diretamente na sessão
 *     do agente, sem passar por chat algum.
 *
 * Uso:
 *   node relay-agent.js                # Processa a fila e sai
 *   node relay-agent.js --watch        # Monitora a fila continuamente
 *   node relay-agent.js --clear        # Limpa a fila (arquiva)
 *   node relay-agent.js --dump         # Mostra conteúdo da fila
 *
 * Para rodar em background:
 *   nohup node relay-agent.js --watch > logs/relay.log 2>&1 &
 */

import { readFileSync, renameSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "logs");
const QUEUE_FILE = join(LOG_DIR, "message_queue.jsonl");
const PROCESSED_DIR = join(LOG_DIR, "processed");
const LOCK_FILE = join(LOG_DIR, "relay.lock");

const args = process.argv.slice(2);
const WATCH_MODE = args.includes("--watch");
const CLEAR_MODE = args.includes("--clear");
const DUMP_MODE = args.includes("--dump");
const POLL_INTERVAL_MS = 10_000;
const AGENT_TIMEOUT_MS = 30_000;

// ─── Utilitários ────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readQueue() {
  if (!existsSync(QUEUE_FILE)) return [];
  const content = readFileSync(QUEUE_FILE, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map((line) => JSON.parse(line));
}

function acquireLock() {
  if (existsSync(LOCK_FILE)) return false;
  try {
    writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try { renameSync(LOCK_FILE, LOCK_FILE + ".done"); } catch {}
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
}

// ─── Envio para agente ─────────────────────────────────────────────

/**
 * Encaminha mensagem para a sessão interna do agente via
 * `openclaw agent --session-key <key> --message <msg>`.
 *
 * O CLI se conecta ao Gateway e entrega a mensagem na sessão do agente.
 * Como a sessionKey é INTERNA (agent:main:oliver, etc.), a mensagem
 * chega direto na sessão, sem Telegram.
 *
 * Se o modelo demorar a responder (30s+), o processo é abortado —
 * a mensagem já foi entregue na sessão.
 */
function forwardToAgent(sessionKey, message) {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

    const proc = spawn("openclaw", [
      "agent",
      "--session-key", sessionKey,
      "--message", message,
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      signal: controller.signal,
    });

    let stderr = "";
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ success: true });
      } else if (code === null) {
        // Abortado (timeout) — mensagem foi entregue, o modelo só demorou
        resolve({ success: true, note: "timeout (model response), delivered to session" });
      } else {
        resolve({ success: false, error: stderr.trim() || `exit ${code}` });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        resolve({ success: true, note: "timeout (model response), delivered to session" });
      } else {
        resolve({ success: false, error: err.message });
      }
    });
  });
}

// ─── Processamento ──────────────────────────────────────────────────

async function processQueue() {
  if (!acquireLock()) {
    log("Fila bloqueada por outro processo, pulando...");
    return 0;
  }

  try {
    const queue = readQueue();
    if (queue.length === 0) {
      log("Fila vazia.");
      return 0;
    }

    log(`Processando ${queue.length} mensagem(ns)...`);
    let forwarded = 0;
    let failed = 0;

    for (const entry of queue) {
      const agent = entry.agent || "desconhecido";
      const sessionKey = entry.sessionKey;
      const message = entry.message;

      if (!sessionKey || !message) {
        log(`  ⚠️  [${agent}] Entrada inválida`);
        failed++;
        continue;
      }

      log(`  ➡️  [${agent}] sessionKey=${sessionKey}`);
      const result = await forwardToAgent(sessionKey, message);

      if (result.success) {
        log(`  ✅ [${agent}] Entregue${result.note ? ` (${result.note})` : ""}`);
        forwarded++;
      } else {
        log(`  ❌ [${agent}] Falha: ${(result.error || "").slice(0, 120)}`);
        failed++;
      }
    }

    // Arquiva a fila processada
    ensureDir(PROCESSED_DIR);
    const archiveName = `relay-${Date.now()}.jsonl`;
    renameSync(QUEUE_FILE, join(PROCESSED_DIR, archiveName));
    log(`📦 Fila arquivada em processed/${archiveName}`);
    log(`✅ ${forwarded} entregues, ${failed} falhas`);

    return forwarded;
  } finally {
    releaseLock();
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  log("═══════════════════════════════════════");
  log(" 🔌 Neon Webhook — Relay Agent");
  log("═══════════════════════════════════════");

  if (DUMP_MODE) {
    const queue = readQueue();
    if (queue.length === 0) {
      log("📭 Fila vazia.");
      return;
    }
    queue.forEach((entry, i) => {
      console.log(`--- [${i + 1}] ---`);
      console.log(JSON.stringify(entry, null, 2));
    });
    return;
  }

  if (CLEAR_MODE) {
    ensureDir(PROCESSED_DIR);
    const ts = Date.now();
    if (existsSync(QUEUE_FILE)) {
      renameSync(QUEUE_FILE, join(PROCESSED_DIR, `relay-cleared-${ts}.jsonl`));
      log("🗑️  Fila limpa (arquivada).");
    } else {
      log("📭  Fila já está vazia.");
    }
    return;
  }

  if (WATCH_MODE) {
    log(`👀 Monitorando: ${QUEUE_FILE}`);
    log(`   Polling a cada ${POLL_INTERVAL_MS / 1000}s\n`);
    while (true) {
      await processQueue();
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  await processQueue();
}

main().catch((err) => {
  log(`ERRO FATAL: ${err.message}`);
  process.exit(1);
});
