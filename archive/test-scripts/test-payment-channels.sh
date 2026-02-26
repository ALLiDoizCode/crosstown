#!/bin/bash
# Clean Payment Channel Test Harness
# Properly manages Anvil and connector lifecycle to avoid nonce issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Payment Channel Test Harness${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Cleaning up...${NC}"

  # Kill all test processes
  for port in 3051 3052 8091 8092 7101 7102 3101 3102; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
      echo "Killing process on port $port (PID: $pid)"
      kill -9 $pid 2>/dev/null || true
    fi
  done

  # Remove log files
  rm -f /tmp/connector-peer*.log /tmp/crosstown-peer*.log

  echo -e "${GREEN}Cleanup complete${NC}"
}

trap cleanup EXIT

# Step 1: Ensure Anvil is fresh
echo -e "${BLUE}Step 1: Restarting Anvil for fresh blockchain state${NC}"
docker restart crosstown-anvil
sleep 5

# Verify Anvil is healthy
if ! curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -q "result"; then
  echo -e "${RED}ERROR: Anvil is not responding${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Anvil is healthy${NC}"
echo ""

# Step 2: Deploy contracts
echo -e "${BLUE}Step 2: Deploying TokenNetworkRegistry and contracts${NC}"
cd /Users/jonathangreen/Documents/connector/packages/contracts

/Users/jonathangreen/.foundry/bin/forge script \
  script/DeployLocal.s.sol:DeployLocalScript \
  --rpc-url http://localhost:8545 \
  --broadcast \
  2>&1 | grep -A 5 "DEPLOYMENT COMPLETE" || {
  echo -e "${RED}ERROR: Contract deployment failed${NC}"
  exit 1
}

# Extract deployed addresses from deployment output (deterministic addresses)
AGENT_TOKEN="0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
TOKEN_REGISTRY="0x0165878A594ca255338adfa4d48449f69242Eb8F"
TOKEN_NETWORK="0x3B02fF1e626Ed7a8fd6eC5299e2C54e1421B626B"

echo -e "${GREEN}✓ Contracts deployed:${NC}"
echo "  AGENT Token:           $AGENT_TOKEN"
echo "  TokenNetworkRegistry:  $TOKEN_REGISTRY"
echo "  TokenNetwork:          $TOKEN_NETWORK"
echo ""

# Verify peer addresses have tokens
PEER1_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
PEER2_ADDR="0x90F79bf6EB2c4f870365E785982E1f101E93b906"

echo -e "${BLUE}Step 3: Verifying token balances${NC}"
for addr in $PEER1_ADDR $PEER2_ADDR; do
  balance_hex=$(curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$AGENT_TOKEN\",\"data\":\"0x70a08231000000000000000000000000${addr:2}\"},\"latest\"],\"id\":1}" \
    | jq -r '.result')

  # Convert hex to decimal using python
  balance=$(python3 -c "print(int('$balance_hex', 16) // 10**18)" 2>/dev/null || echo "0")

  if [ "$balance" = "0" ]; then
    echo -e "${RED}ERROR: $addr has no tokens (balance_hex: $balance_hex)${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ $addr has $balance AGENT tokens${NC}"
done
echo ""

# Step 4: Clean up any existing processes
echo -e "${BLUE}Step 4: Ensuring no stale processes${NC}"
for port in 3051 3052 8091 8092 7101 7102 3101 3102; do
  pid=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "  Killing stale process on port $port"
    kill -9 $pid 2>/dev/null || true
  fi
done
echo -e "${GREEN}✓ All ports clear${NC}"
echo ""

# Step 5: Update test script with new addresses
echo -e "${BLUE}Step 5: Updating test configuration${NC}"
cd /Users/jonathangreen/Documents/crosstown

# Update the addresses in the test script
sed -i.bak "s/export TOKEN_NETWORK_REGISTRY=0x[a-fA-F0-9]\{40\}/export TOKEN_NETWORK_REGISTRY=$TOKEN_REGISTRY/g" run-local-bootstrap-test.sh
sed -i.bak "s/export M2M_TOKEN_ADDRESS=0x[a-fA-F0-9]\{40\}/export M2M_TOKEN_ADDRESS=$AGENT_TOKEN/g" run-local-bootstrap-test.sh
rm -f run-local-bootstrap-test.sh.bak

echo -e "${GREEN}✓ Test configuration updated${NC}"
echo ""

# Step 6: Run the bootstrap test
echo -e "${BLUE}Step 6: Running bootstrap test with payment channels${NC}"
echo -e "${YELLOW}This will start 4 processes (2 connectors + 2 crosstown nodes)${NC}"
echo ""

# Run the test and capture output
bash run-local-bootstrap-test.sh 2>&1 | tee /tmp/bootstrap-test-output.log

# Check results
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Test Results${NC}"
echo -e "${BLUE}================================${NC}"

if grep -q "channelCount: 1" /tmp/crosstown-peer2.log 2>/dev/null; then
  echo -e "${GREEN}✓ SUCCESS: Payment channel created!${NC}"
  grep "channelCount" /tmp/crosstown-peer2.log
elif grep -q "channelCount: 0" /tmp/crosstown-peer2.log 2>/dev/null; then
  echo -e "${YELLOW}⚠ PARTIAL: Bootstrap succeeded but channel count is 0${NC}"
  echo "Checking logs for errors..."

  if grep -q "Channel open failed" /tmp/connector-peer2.log 2>/dev/null; then
    echo -e "${RED}Channel opening failed. Last error:${NC}"
    strings /tmp/connector-peer2.log | grep -A 5 "Channel open failed" | tail -10
  fi
else
  echo -e "${RED}✗ FAILED: Could not determine channel status${NC}"
fi

echo ""
echo -e "${BLUE}Log files available at:${NC}"
echo "  /tmp/connector-peer1.log"
echo "  /tmp/crosstown-peer1.log"
echo "  /tmp/connector-peer2.log"
echo "  /tmp/crosstown-peer2.log"
echo "  /tmp/bootstrap-test-output.log"
