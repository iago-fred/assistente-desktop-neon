#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# deploy.sh — Build + Deploy do Neon Webhook via Docker
# ─────────────────────────────────────────────────────────────

APP_NAME="neon-webhook"
COMPOSE_FILE="docker-compose.yml"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "════════════════════════════════════════════"
echo " 🚀 Neon Webhook — Deploy"
echo "════════════════════════════════════════════"

# 1. Build da imagem
echo ""
echo "📦 Buildando imagem Docker..."
docker compose -f "$COMPOSE_FILE" build --pull

# 2. Para o container existente (se houver)
echo ""
echo "🛑 Parando container existente..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

# 3. Sobe o novo container
echo ""
echo "▶️  Subindo novo container..."
docker compose -f "$COMPOSE_FILE" up -d

# 4. Verifica se subiu
echo ""
echo "📋 Status:"
docker ps --filter "name=$APP_NAME" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"

# 5. Últimas linhas dos logs
echo ""
echo "📝 Últimos logs:"
sleep 1
docker compose -f "$COMPOSE_FILE" logs --tail 10

echo ""
echo "✅ Deploy concluído!"
echo "   Container: $APP_NAME"
echo "   Porta:     3344"
echo "════════════════════════════════════════════"
