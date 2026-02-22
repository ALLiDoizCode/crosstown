#!/usr/bin/env bash
#
# Test Nostr SPSP Bootstrap Flow
#
# This script tests the complete bootstrap flow from BOOTSTRAP-TEST-PLAN.md
#

set -e

echo "=================================================="
echo "Nostr SPSP Bootstrap Flow Test"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function test_phase() {
  local phase_num=$1
  local phase_name=$2
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Phase $phase_num: $phase_name${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

function check_result() {
  local description=$1
  local result=$2
  if [ -n "$result" ]; then
    echo -e "${GREEN}✅ $description${NC}"
    echo "$result" | head -5
    echo ""
    return 0
  else
    echo -e "${RED}❌ $description${NC}"
    echo ""
    return 1
  fi
}

# Phase 1: Genesis Peer Startup
test_phase 1 "Genesis Peer Startup"

echo "Checking genesis peer (peer1) initialization..."
sleep 2

RELAY_STARTED=$(docker logs crosstown-peer1 2>&1 | grep "Relay listening on")
check_result "Relay started on port 7100" "$RELAY_STARTED"

KIND_10032=$(docker logs crosstown-peer1 2>&1 | grep "ILP info published successfully")
check_result "Genesis published kind:10032" "$KIND_10032"

BOOTSTRAP_NODE=$(docker logs crosstown-peer1 2>&1 | grep "running as bootstrap node")
check_result "Genesis running as bootstrap node" "$BOOTSTRAP_NODE"

# Phase 2: Joiner Peer Discovery
test_phase 2 "Joiner Peer Discovery"

echo "Checking peer2 discovery of genesis..."

PEER2_BOOTSTRAP=$(docker logs crosstown-peer2 2>&1 | grep "Bootstrap.*discovering")
check_result "Peer2 started discovery phase" "$PEER2_BOOTSTRAP"

PEER2_RELAY=$(docker logs crosstown-peer2 2>&1 | grep -E "Querying.*crosstown-peer1.*7100" || echo "")
if [ -n "$PEER2_RELAY" ]; then
  check_result "Peer2 querying genesis relay" "$PEER2_RELAY"
else
  echo -e "${RED}⚠️  Peer2 not querying genesis relay correctly${NC}"
  echo "Expected: ws://crosstown-peer1:7100"
  echo "Actual logs:"
  docker logs crosstown-peer2 2>&1 | grep "Querying" | head -3
  echo ""
fi

# Phase 3: SPSP Handshake
test_phase 3 "SPSP Handshake (The Critical Part!)"

echo "Checking SPSP request/response exchange..."

SPSP_REQUEST=$(docker logs crosstown-peer2 2>&1 | grep -i "SPSP.*request" || echo "")
check_result "Peer2 sent SPSP request" "$SPSP_REQUEST" || echo "⚠️  Check if SPSP handshake initiated"

SPSP_RESPONSE=$(docker logs crosstown-peer1 2>&1 | grep -i "SPSP.*response" || echo "")
check_result "Genesis sent SPSP response" "$SPSP_RESPONSE" || echo "⚠️  Genesis should handle SPSP requests"

CHANNEL_OPENED=$(docker logs crosstown-peer1 2>&1 | grep -i "channel.*open" || echo "")
check_result "Payment channel opened" "$CHANNEL_OPENED" || echo "⚠️  Channel should open during SPSP handshake"

# Check connector peer registration
echo "Checking connector peer registration..."
PEER_REGISTERED=$(curl -s http://localhost:8092/admin/peers 2>/dev/null | grep -i "nostr-" || echo "")
check_result "BTP peer registered with SPSP secret" "$PEER_REGISTERED" || echo "⚠️  Peer should be registered in connector"

# Phase 4: Announcement
test_phase 4 "Announcement"

PEER2_ANNOUNCED=$(docker logs crosstown-peer2 2>&1 | grep -i "announced\|kind:10032" || echo "")
check_result "Peer2 announced to relay" "$PEER2_ANNOUNCED" || echo "⚠️  Peer2 should publish own kind:10032"

# Phase 5: Packet Routing
test_phase 5 "Packet Routing (BTP, not local delivery)"

echo "This phase requires sending test packets - see BOOTSTRAP-TEST-PLAN.md Phase 5"
echo "Run: node test-nostr-event-publish.mjs"
echo ""

# Summary
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo ""
echo "Review the results above. For detailed verification, see:"
echo "  - BOOTSTRAP-TEST-PLAN.md"
echo "  - docker logs crosstown-peer1"
echo "  - docker logs crosstown-peer2"
echo "  - curl http://localhost:8091/admin/channels"
echo "  - curl http://localhost:8092/admin/peers"
echo ""
