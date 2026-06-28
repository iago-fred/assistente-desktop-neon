import type { FastifyRequest, FastifyReply } from "fastify";
import type { RegisterPayload, ApiResponse } from "../types/index.js";

/**
 * POST /webhook/register
 * Placeholder para registro de novos agentes/clientes.
 * No MVP apenas valida e retorna sucesso — sem persistência.
 */
export async function handleRegister(
  request: FastifyRequest<{ Body: RegisterPayload }>,
  reply: FastifyReply,
): Promise<void> {
  const { agent, name, owner } = request.body;

  if (!agent || !name || !owner) {
    const res: ApiResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      error:
        "Campos obrigatórios: 'agent' (id), 'name' (string), 'owner' (string)",
    };
    reply.code(400).send(res);
    return;
  }

  const res: ApiResponse = {
    status: "registered",
    agent: name,
    timestamp: new Date().toISOString(),
  };

  reply.code(201).send(res);
}
