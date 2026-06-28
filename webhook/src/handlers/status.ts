import type { FastifyRequest, FastifyReply } from "fastify";
import { getAgentsStatus } from "../services/agentRouter.js";

export async function handleStatus(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const agents = getAgentsStatus();

  reply.code(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
    agents,
  });
}
