# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Cache de dependências
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

# Código fonte
COPY src/ ./src/
RUN npm run build && \
    npm ci --omit=dev && \
    rm -rf src/ tsconfig.json

# Stage 2: Runtime enxuto
FROM node:22-alpine

WORKDIR /app

# Título da janela (metadata)
LABEL org.opencontainers.image.title="neon-webhook"
LABEL org.opencontainers.image.description="Webhook central de integração entre apps desktop e agentes OpenClaw"
LABEL org.opencontainers.image.version="0.1.0"

# Usuário não-root
RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p /app/logs && chown -R app:app /app
USER app

# Copia só o necessário do builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 3344

ENV NODE_ENV=production
ENV WEBHOOK_PORT=3344
ENV WEBHOOK_HOST=0.0.0.0

CMD ["node", "dist/index.js"]
