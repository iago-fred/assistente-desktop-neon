import type { FastifyInstance } from "fastify";
import { handleMessage } from "./handlers/message.js";
import { handleEvent } from "./handlers/event.js";
import { handleStatus } from "./handlers/status.js";
import { handleRegister } from "./handlers/register.js";

export function registerRoutes(app: FastifyInstance): void {
  // POST /webhook/message — Enviar mensagem pra um agente
  app.post("/webhook/message", handleMessage);

  // POST /webhook/event — Notificar evento (ex: clique, interação)
  app.post("/webhook/event", handleEvent);

  // GET /webhook/status — Status dos agentes
  app.get("/webhook/status", handleStatus);

  // POST /webhook/register — Registrar novo agente/cliente (placeholder)
  app.post("/webhook/register", handleRegister);

  // Health check simples
  app.get("/health", async () => ({
    status: "ok",
    service: "neon-webhook",
    version: "0.1.0",
  }));
}
