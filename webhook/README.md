# 🔌 Neon Webhook — API de Integração com Agentes

Servidor webhook central que recebe requisições dos apps desktop (Neon overlay, futuramente Emily overlay, etc.) e roteia para os agentes do OpenClaw via CLI.

## Stack

- **Fastify** + **TypeScript** — leve e rápido
- **Pino** — logs estruturados com `pino-pretty` no dev

## Pré-requisitos

- **Node.js** v18+
- **OpenClaw CLI** no PATH (para rotear mensagens aos agentes)

## Instalação

```bash
cd webhook/
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Inicia com hot-reload em `http://localhost:3344`.

## Produção

```bash
npm run build
npm start
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/webhook/message` | Envia uma mensagem para um agente |
| `POST` | `/webhook/event` | Registra um evento (ex: clique, interação) |
| `GET` | `/webhook/status` | Retorna status dos agentes |
| `POST` | `/webhook/register` | Registra um novo agente/cliente (placeholder) |
| `GET` | `/health` | Health check do serviço |

## Exemplos de Uso

### Enviar mensagem para a Neon

```bash
curl -X POST http://localhost:3344/webhook/message \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "neon",
    "message": "Bom dia! O que temos na agenda hoje?",
    "metadata": {
      "source": "desktop-windows",
      "position": { "x": 120, "y": 540 }
    }
  }'
```

Resposta:
```json
{
  "status": "sent",
  "agent": "Neon",
  "timestamp": "2026-06-28T20:00:00.000Z"
}
```

### Notificar evento

```bash
curl -X POST http://localhost:3344/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "neon",
    "event": "user_interaction",
    "data": {
      "type": "click",
      "count": 5
    }
  }'
```

### Verificar status dos agentes

```bash
curl http://localhost:3344/webhook/status
```

## Variáveis de Ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `WEBHOOK_PORT` | `3344` | Porta do servidor |
| `WEBHOOK_HOST` | `0.0.0.0` | Host do servidor |

## Agentes Configurados

| ID | Nome | Dono | Session Key |
|----|------|------|-------------|
| `neon` | Neon 👻 | Iago | `agent:main:telegram:direct:8829697706` |
| `emily` | Emily 🌸 | Jéssica | `agent:main:telegram:direct:1732942559` |
| `oliver` | Oliver 🤖 | Iago | `agent:main:oliver` |

## Arquitetura

```
App Desktop ──POST──▶ Webhook Server ──openclaw agent──▶ OpenClaw Gateway ──▶ Agente
                           │
                           ▼
                      logs/events.jsonl
```

## Logs

Eventos são salvos em `logs/events.jsonl` (formato JSON Lines — uma linha por evento).
