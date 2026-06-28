import type { FastifyRequest, FastifyReply } from "fastify";
import type { MessagePayload, ApiResponse } from "../types/index.js";
import {
  validateAgent,
  routeMessageToAgent,
} from "../services/agentRouter.js";

export async function handleMessage(
  request: FastifyRequest<{ Body: MessagePayload }>,
  reply: FastifyReply,
): Promise<void> {
  const { agent, message, metadata } = request.body;

  // Validação básica
  if (!agent || !message) {
    const res: ApiResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Campos obrigatórios: 'agent' (string) e 'message' (string)",
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

  // Envia via openclaw agent --deliver (síncrono)
  const result = await routeMessageToAgent(agent, message, metadata);

  if (result.success) {
    const res: ApiResponse = {
      status: "sent",
      agent: agentConfig.name,
      timestamp: new Date().toISOString(),
    };
    reply.code(200).send(res);
  } else {
    const res: ApiResponse = {
      status: "error",
      agent: agentConfig.name,
      timestamp: new Date().toISOString(),
      error: result.output,
    };
    reply.code(502).send(res);
  }
}
