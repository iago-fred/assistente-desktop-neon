import type { FastifyRequest, FastifyReply } from "fastify";
import type { EventPayload, ApiResponse } from "../types/index.js";
import {
  validateAgent,
  logEvent,
} from "../services/agentRouter.js";

export async function handleEvent(
  request: FastifyRequest<{ Body: EventPayload }>,
  reply: FastifyReply,
): Promise<void> {
  const { agent, event, data } = request.body;

  // Validação básica
  if (!agent || !event) {
    const res: ApiResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Campos obrigatórios: 'agent' (string) e 'event' (string)",
    };
    reply.code(400).send(res);
    return;
  }

  // Valida se o agente existe
  const agentConfig = validateAgent(agent);
  if (!agentConfig) {
    const res: ApiResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      error: `Agente '${agent}' não encontrado. Agentes disponíveis: neon, emily, oliver`,
    };
    reply.code(404).send(res);
    return;
  }

  // Registra o evento
  logEvent(agent, event, data);

  const res: ApiResponse = {
    status: "logged",
    agent: agentConfig.name,
    timestamp: new Date().toISOString(),
  };

  reply.code(200).send(res);
}
