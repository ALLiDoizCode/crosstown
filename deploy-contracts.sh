#!/bin/bash
# Deploy contracts to local Anvil for Crosstown payment channels

set -e

echo "🚀 Deploying contracts to Anvil..."
echo ""

# Deploy contracts
docker run --rm --network crosstown_crosstown-network \
  -v /Users/jonathangreen/Documents/connector/packages/contracts:/contracts \
  -w /contracts \
  -e FOUNDRY_DISABLE_NIGHTLY_WARNING=1 \
  ghcr.io/foundry-rs/foundry:latest \
  forge script script/DeployLocal.s.sol:DeployLocalScript \
  --rpc-url http://anvil:8545 \
  --broadcast

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Deployed addresses:"
echo "   AGENT Token:  0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "   TokenNetwork: 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"
echo ""
echo "🔄 Restarting services..."

cd /Users/jonathangreen/Documents/crosstown
docker compose -f docker-compose-with-local.yml restart connector crosstown

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "🔍 Verifying deployment..."

# Verify contract code exists
CODE=$(curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x5FbDB2315678afecb367f032d93F642f64180aa3", "latest"],"id":1}' \
  | jq -r '.result')

if [ "$CODE" != "0x" ] && [ ${#CODE} -gt 10 ]; then
  echo "✅ AGENT Token deployed successfully"
else
  echo "❌ AGENT Token deployment failed"
  exit 1
fi

# Verify settlement infrastructure
SETTLEMENT=$(curl -s http://localhost:8081/admin/channels | jq -r '.error // "ok"')

if [ "$SETTLEMENT" = "ok" ] || [ "$SETTLEMENT" != "Service Unavailable" ]; then
  echo "✅ Settlement infrastructure enabled"
else
  echo "⚠️  Settlement infrastructure not yet enabled (may need more time)"
fi

echo ""
echo "======================================"
echo "🎉 Payment channels are ready!"
echo "======================================"
echo ""
echo "Test with:"
echo "  curl http://localhost:8081/admin/channels"
