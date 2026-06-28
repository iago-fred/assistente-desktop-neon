#!/usr/bin/env node

/**
 * queue-worker.js — Arquivador da fila de mensagens do webhook
 *
 * Lê `logs/message_queue.jsonl` e arquiva as mensagens processadas.
 * O roteamento real para os agentes é feito via cron job do OpenClaw,
 * que usa `sessions_send` internamente (sem passar pelo Telegram).
 *
 * Uso:
 *   node queue-worker.js                   # Arquivar fila e sair
 *   node queue-worker.js --watch           # Monitorar a fila continuamente
 *   node queue-worker.js --clear           # Limpar a fila (arquivar)
 *   node queue-worker.js --dump            # Mostrar conteúdo da fila
 *
 * Dica: Para rodar em background:
 *   nohup node queue-worker.js --watch > logs/worker.log 2>&1 &
 */

import { readFileSync, renameSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "logs");
const QUEUE_FILE = join(LOG_DIR, "message_queue.jsonl");
const PROCESSED_DIR = join(LOG_DIR, "processed");
const LOCK_FILE = join(LOG_DIR, "queue.lock");

const args = process.argv.slice(2);
const WATCH_MODE = args.includes("--watch");
const CLEAR_MODE = args.includes("--clear");
const DUMP_MODE = args.includes("--dump");
const POLL_INTERVAL_MS = 10_000;

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

// ─── Processamento ──────────────────────────────────────────────────

function archiveQueue() {
  if (!acquireLock()) {
    console.log("[worker] Fila bloqueada por outro processo, pulando...");
    return 0;
  }

  try {
    const queue = readQueue();
    if (queue.length === 0) {
      console.log("[worker] Fila vazia.");
      return 0;
    }

    console.log(`[worker] Arquivando ${queue.length} mensagem(ns)...`);

    for (const entry of queue) {
      const agent = entry.agent || "desconhecido";
      const msg = (entry.message || "").slice(0, 60);
      console.log(`   📝 [${agent}] "${msg}..."`);
    }

    ensureDir(PROCESSED_DIR);
    const archiveName = `queue-${Date.now()}.jsonl`;
    renameSync(QUEUE_FILE, join(PROCESSED_DIR, archiveName));
    console.log(`[worker] 📦 Arquivado em processed/${archiveName}`);
    console.log(`[worker] ✅ ${queue.length} mensagens aguardando processamento pelo relay.`);

    return queue.length;
  } finally {
    releaseLock();
  }
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  if (DUMP_MODE) {
    const queue = readQueue();
    if (queue.length === 0) {
      console.log("📭 Fila vazia.");
      return;
    }
    console.log(`📋 ${queue.length} mensagem(ns) na fila:\n`);
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
      renameSync(QUEUE_FILE, join(PROCESSED_DIR, `queue-cleared-${ts}.jsonl`));
      console.log("🗑️  Fila limpa (arquivada em processed/).");
    } else {
      console.log("📭  Fila já está vazia.");
    }
    return;
  }

  console.log("═══════════════════════════════════════");
  console.log(" 🔌 Neon Webhook — Queue Archiver");
  console.log("═══════════════════════════════════════");

  if (WATCH_MODE) {
    console.log(`👀 Monitorando: ${QUEUE_FILE}`);
    console.log(`   Polling a cada ${POLL_INTERVAL_MS / 1000}s`);
    console.log("   Pressione Ctrl+C para parar.\n");
    setInterval(archiveQueue, POLL_INTERVAL_MS);
    archiveQueue(); // executa imediatamente na primeira vez
    return;
  }

  archiveQueue();
}

main();
