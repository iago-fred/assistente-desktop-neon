import Fastify from "fastify";
import { registerRoutes } from "./router.js";

const PORT = parseInt(process.env.WEBHOOK_PORT ?? "3344", 10);
const HOST = process.env.WEBHOOK_HOST ?? "0.0.0.0";

async function main() {
  const app = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
    },
  });

  // Registra todas as rotas
  registerRoutes(app);

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Recebido ${signal}, desligando...`);
      await app.close();
      process.exit(0);
    });
  }

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 Neon Webhook rodando em http://${HOST}:${PORT}`);
    app.log.info(`📋 Endpoints:`);
    app.log.info(`   POST /webhook/message   — Enviar mensagem pra um agente`);
    app.log.info(`   POST /webhook/event     — Notificar evento`);
    app.log.info(`   GET  /webhook/status    — Status dos agentes`);
    app.log.info(`   POST /webhook/register  — Registrar novo agente`);
    app.log.info(`   GET  /health            — Health check`);
    app.log.info(`👻 Agentes configurados: neon, emily, oliver`);
  } catch (err) {
    app.log.error(err, "Erro ao iniciar servidor");
    process.exit(1);
  }
}

main();
