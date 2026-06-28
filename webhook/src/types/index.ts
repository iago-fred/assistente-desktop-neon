/** Agente configurado no sistema */
export interface AgentConfig {
  name: string;
  owner: string;
  sessionKey: string;
  description: string;
}

/** Payload para POST /webhook/message */
export interface MessagePayload {
  agent: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Payload para POST /webhook/event */
export interface EventPayload {
  agent: string;
  event: string;
  data?: Record<string, unknown>;
}

/** Payload para POST /webhook/register */
export interface RegisterPayload {
  agent: string;
  name: string;
  owner: string;
  endpoint?: string;
}

/** Resposta padronizada da API */
export interface ApiResponse {
  status: "sent" | "logged" | "error" | "registered";
  agent?: string;
  response?: string;
  timestamp: string;
  error?: string;
}

/** Status de um agente individual */
export interface AgentStatus {
  status: "online" | "offline" | "unknown";
  last_seen: string;
  description: string;
}

/** Tipo do mapa de agentes */
export type AgentMap = Record<string, AgentConfig>;
