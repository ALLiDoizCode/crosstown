#!/bin/bash
# Comprehensive Bootstrap Test - Local Node Processes
# This script starts all components and monitors the bootstrap flow

set -e

CROSSTOWN_DIR="/Users/jonathangreen/Documents/crosstown"
CONNECTOR_DIR="/Users/jonathangreen/Documents/connector"

echo "🧪 Bootstrap Flow Test - Local Node Processes"
echo "================================================"
echo ""

# Cleanup function
cleanup() {
  echo ""
  echo "🛑 Stopping all processes..."
  pkill -f "connector.*dist/main.js" || true
  pkill -f "entrypoint-with-bootstrap" || true
  sleep 2
  echo "✅ All processes stopped"
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

# Clean up any existing processes
cleanup

echo "✅ Starting Connector Peer1 (Genesis)..."
export CONFIG_FILE="$CROSSTOWN_DIR/config/connector-peer1.yaml"
export LOG_LEVEL=info
export ENVIRONMENT=development
export LOCAL_DELIVERY_URL=http://localhost:3101
export SETTLEMENT_ENABLED=true
export BASE_L2_RPC_URL=http://localhost:8545
export TOKEN_NETWORK_REGISTRY=0x0165878A594ca255338adfa4d48449f69242Eb8F
export M2M_TOKEN_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
export TREASURY_EVM_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

(cd "$CONNECTOR_DIR/packages/connector" && nohup node dist/main.js > /tmp/connector-peer1.log 2>&1 &)
sleep 3

echo "✅ Starting Crosstown Peer1 (Genesis)..."
export NODE_ID=peer1
export NOSTR_SECRET_KEY=d5c4f02f7c0f9c8e7a6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a
export ILP_ADDRESS=g.crosstown.peer1
export CONNECTOR_ADMIN_URL=http://localhost:8091
export CONNECTOR_URL=http://localhost:8081
export BTP_ENDPOINT=btp+ws://localhost:3051
export BLS_PORT=3101
export WS_PORT=7101
export BASE_PRICE_PER_BYTE=10
export SPSP_MIN_PRICE=0
export PEER_EVM_ADDRESS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
export M2M_TOKEN_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
export TOKEN_NETWORK_REGISTRY=0x0165878A594ca255338adfa4d48449f69242Eb8F
export INITIAL_DEPOSIT=100000
export DATA_DIR=/tmp/data-peer1

(cd "$CROSSTOWN_DIR/packages/bls" && nohup node dist/entrypoint-with-bootstrap.js > /tmp/crosstown-peer1.log 2>&1 &)
sleep 5

echo "✅ Starting Connector Peer2 (Joiner)..."
export CONFIG_FILE="$CROSSTOWN_DIR/config/connector-peer2.yaml"
export LOG_LEVEL=info
export ENVIRONMENT=development
export LOCAL_DELIVERY_URL=http://localhost:3102
export SETTLEMENT_ENABLED=true
export BASE_L2_RPC_URL=http://localhost:8545
export TOKEN_NETWORK_REGISTRY=0x0165878A594ca255338adfa4d48449f69242Eb8F
export M2M_TOKEN_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
export TREASURY_EVM_PRIVATE_KEY=0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
export EXPLORER_ENABLED=false

(cd "$CONNECTOR_DIR/packages/connector" && nohup node dist/main.js > /tmp/connector-peer2.log 2>&1 &)
sleep 3

echo "✅ Starting Crosstown Peer2 (Joiner)..."
export NODE_ID=peer2
export NOSTR_SECRET_KEY=b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3
export ILP_ADDRESS=g.crosstown.peer2
export CONNECTOR_ADMIN_URL=http://localhost:8092
export CONNECTOR_URL=http://localhost:8082
export BTP_ENDPOINT=btp+ws://localhost:3052
export BLS_PORT=3102
export WS_PORT=7102
export BASE_PRICE_PER_BYTE=10
export SPSP_MIN_PRICE=100
export PEER_EVM_ADDRESS=0x90F79bf6EB2c4f870365E785982E1f101E93b906
export M2M_TOKEN_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
export TOKEN_NETWORK_REGISTRY=0x0165878A594ca255338adfa4d48449f69242Eb8F
export INITIAL_DEPOSIT=100000
export DATA_DIR=/tmp/data-peer2
export BOOTSTRAP_RELAYS=ws://localhost:7101
export BOOTSTRAP_PEERS=719705df863f0190e0c124bbb11dd84b6374d077f66c4912a039324c98dc25e3

(cd "$CROSSTOWN_DIR/packages/bls" && nohup node dist/entrypoint-with-bootstrap.js > /tmp/crosstown-peer2.log 2>&1 &)
sleep 8

echo ""
echo "================================================"
echo "🎉 All processes started!"
echo "================================================"
echo ""
echo "================================================"
echo "📋 Bootstrap Verification"
echo "================================================"
echo ""

echo "1️⃣  Checking Genesis (Peer1) published kind:10032..."
curl -s http://localhost:3101/health | jq . || echo "❌ Peer1 not responding"
echo ""

echo "2️⃣  Checking Joiner (Peer2) discovered Peer1..."
PEERS=$(curl -s http://localhost:8092/admin/peers | jq '.peers | length')
echo "   Peer2 knows about $PEERS peer(s)"
curl -s http://localhost:8092/admin/peers | jq '.peers[] | {id, connected, ilpAddresses}'
echo ""

echo "3️⃣  Checking BTP connection status..."
CONNECTED=$(curl -s http://localhost:8092/admin/peers | jq -r '.peers[] | select(.connected == true) | .id')
if [ -n "$CONNECTED" ]; then
  echo "   ✅ BTP connected to: $CONNECTED"
else
  echo "   ⚠️  BTP not yet connected"
fi
echo ""

echo "4️⃣  Test SPSP via ILP..."
curl -s http://localhost:8092/admin/ilp/send -X POST -H "Content-Type: application/json" -d '{"destination":"g.crosstown.peer1","amount":"0","data":"dGVzdA=="}' | jq .
echo ""

echo "================================================"
echo "📄 Log Files:"
echo "================================================"
echo "  tail -f /tmp/connector-peer1.log"
echo "  tail -f /tmp/crosstown-peer1.log"
echo "  tail -f /tmp/connector-peer2.log"
echo "  tail -f /tmp/crosstown-peer2.log"
echo ""
echo "📊 Recent Bootstrap Logs from Peer2:"
echo "================================================"
tail -30 /tmp/crosstown-peer2.log | grep -E "Bootstrap|SPSP|BTP|connected" || true
echo ""
echo "Press Ctrl+C to stop all processes..."
echo ""

# Keep script running
wait
