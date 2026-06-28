#!/usr/bin/env node

/**
 * queue-worker.js — Processa a fila de mensagens do webhook
 *
 * Lê `logs/message_queue.jsonl` e encaminha cada mensagem para o agente
 * via OpenClaw CLI.
 *
 * Estratégia de roteamento:
 *   - Agentes com canal (telegram/whatsapp/etc): usa `openclaw message send`
 *     que é fire-and-forget e retorna instantaneamente.
 *   - Agentes sem canal (apenas sessionKey): usa `openclaw agent` que
 *     processa a mensagem de forma síncrona (mais lento).
 *
 * Uso:
 *   node queue-worker.js                   # Processa uma vez e sai
 *   node queue-worker.js --watch           # Monitora a fila continuamente
 *   node queue-worker.js --clear           # Limpa a fila (arquiva)
 *
 * Dica: Para rodar em background:
 *   nohup node queue-worker.js --watch > logs/worker.log 2>&1 &
 */

import { readFileSync, renameSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
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
const POLL_INTERVAL_MS = 5_000;

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

/**
 * Envia mensagem para um agente via `openclaw message send`.
 * Funciona para agentes com canal configurado (telegram, etc.).
 * É fire-and-forget — retorna instantaneamente.
 */
function sendViaMessage(channel, target, message) {
  return new Promise((resolve) => {
    const proc = spawn("openclaw", [
      "message", "send",
      "--channel", channel,
      "--target", target,
      "--message", message,
      "--json",
    ], {
      timeout: 15_000,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout);
          resolve({ success: true, output: JSON.stringify(parsed) });
        } catch {
          resolve({ success: true, output: stdout.trim() });
        }
      } else {
        resolve({ success: false, output: stderr.trim() || `exit code ${code}` });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: err.message });
    });
  });
}

/**
 * Envia mensagem via `openclaw agent` (síncrono).
 * Usado para agentes que só têm sessionKey.
 */
function sendViaAgent(sessionKey, message) {
  return new Promise((resolve) => {
    const proc = spawn("openclaw", [
      "agent",
      "--session-key", sessionKey,
      "--message", message,
      "--json",
    ], {
      timeout: 35_000,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        resolve({ success: false, output: stderr.trim() || `exit code ${code}` });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: err.message });
    });
  });
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

async function processQueue() {
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

    console.log(`[worker] Processando ${queue.length} mensagem(ns)...`);
    let processed = 0;
    let failed = 0;

    for (const entry of queue) {
      const agent = entry.agent || "desconhecido";
      const channel = entry.channel;
      const target = entry.target;
      const sessionKey = entry.sessionKey;
      const message = entry.message;

      if (!message) {
        console.log(`[worker] ⚠️  Entrada inválida: ${JSON.stringify(entry)}`);
        failed++;
        continue;
      }

      // Tenta via channel/target (fire-and-forget) primeiro
      if (channel && target) {
        console.log(`[worker] ➡️  [${agent}] message send --channel ${channel} --target ${target}`);
        const result = await sendViaMessage(channel, target, message);
        if (result.success) {
          console.log(`[worker] ✅ [${agent}] Mensagem enviada (msgId: ${result.output.slice(0, 80)})`);
          processed++;
        } else {
          console.log(`[worker] ⚠️  [${agent}] message send falhou: ${result.output.slice(0, 100)}`);
          console.log(`[worker]    ➡️  Tentando via agent --session-key...`);
          // Fallback: tenta via agent CLI
          const fallback = await sendViaAgent(sessionKey, message);
          if (fallback.success) {
            console.log(`[worker] ✅ [${agent}] Mensagem enviada via agent CLI`);
            processed++;
          } else {
            console.log(`[worker] ❌ [${agent}] Falha total: ${fallback.output.slice(0, 100)}`);
            failed++;
          }
        }
      } else if (sessionKey) {
        // Apenas sessionKey disponível
        console.log(`[worker] ➡️  [${agent}] agent --session-key ${sessionKey}`);
        const result = await sendViaAgent(sessionKey, message);
        if (result.success) {
          console.log(`[worker] ✅ [${agent}] Mensagem enviada`);
          processed++;
        } else {
          console.log(`[worker] ❌ [${agent}] Falha: ${result.output.slice(0, 100)}`);
          failed++;
        }
      } else {
        console.log(`[worker] ❌ [${agent}] Sem canal nem sessionKey configurados`);
        failed++;
      }
    }

    // Arquiva a fila processada
    ensureDir(PROCESSED_DIR);
    const archiveName = `queue-${Date.now()}.jsonl`;
    renameSync(QUEUE_FILE, join(PROCESSED_DIR, archiveName));
    console.log(`[worker] 📦 Fila arquivada em processed/${archiveName}`);

    console.log(`[worker] ✅ ${processed} enviadas, ${failed} falhas`);
    return processed;
  } finally {
    releaseLock();
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log(" 🔌 Neon Webhook — Queue Worker");
  console.log("═══════════════════════════════════════");

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

  if (WATCH_MODE) {
    console.log(`👀 Monitorando: ${QUEUE_FILE}`);
    console.log(`   Polling a cada ${POLL_INTERVAL_MS / 1000}s`);
    console.log("   Pressione Ctrl+C para parar.\n");
    while (true) {
      await processQueue();
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  await processQueue();
}

main().catch(console.error);
