#!/bin/bash
# Fast development rebuild script
# Builds packages locally and restarts containers (no Docker rebuild!)

set -e

echo "🔨 Building packages locally..."
pnpm --filter @crosstown/core build
pnpm --filter @crosstown/relay build
pnpm --filter @crosstown/client build
pnpm --filter @crosstown/bls build

echo ""
echo "🔄 Recreating containers with volume mounts..."
docker-compose -f docker-compose-bootstrap.yml -f docker-compose-bootstrap-dev.yml up -d crosstown-peer1 crosstown-peer2

echo ""
echo "✅ Done! Checking logs..."
sleep 3
docker logs crosstown-peer1 --tail 20

echo ""
echo "💡 To view logs:"
echo "   docker logs crosstown-peer1 -f"
echo "   docker logs crosstown-peer2 -f"
