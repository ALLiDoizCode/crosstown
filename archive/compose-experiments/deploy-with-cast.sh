#!/bin/bash
# Deploy contracts using cast send (direct bytecode deployment)

set -e

PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC_URL="http://localhost:8545"

echo "🚀 Deploying contracts using cast..."
echo ""

# Get the bytecode from compiled artifacts
cd /Users/jonathangreen/Documents/connector/packages/contracts

# Deploy MockERC20 (AGENT Token)
echo "📝 Deploying AGENT Token..."
BYTECODE=$(cat out/MockERC20.sol/MockERC20.json | jq -r '.bytecode.object')

# Constructor args: "Agent Token", "AGENT", 18
# Need to encode constructor arguments
CONSTRUCTOR_ARGS=$(docker run --rm ghcr.io/foundry-rs/foundry:latest \
  cast abi-encode "constructor(string,string,uint8)" "Agent Token" "AGENT" 18)

DEPLOY_DATA="${BYTECODE}${CONSTRUCTOR_ARGS:2}"  # Remove 0x from constructor args

echo "Sending deployment transaction..."
TX_HASH=$(docker run --rm --network crosstown_crosstown-network \
  ghcr.io/foundry-rs/foundry:latest \
  cast send --rpc-url http://anvil:8545 \
  --private-key $PRIVATE_KEY \
  --create "$DEPLOY_DATA" \
  --json | jq -r '.transactionHash')

echo "Transaction hash: $TX_HASH"

# Get contract address
sleep 2
TOKEN_ADDRESS=$(docker run --rm --network crosstown_crosstown-network \
  ghcr.io/foundry-rs/foundry:latest \
  cast receipt $TX_HASH --rpc-url http://anvil:8545 --json | jq -r '.contractAddress')

echo "✅ AGENT Token deployed to: $TOKEN_ADDRESS"
echo ""

# Deploy TokenNetwork
echo "📝 Deploying TokenNetwork..."
BYTECODE=$(cat out/TokenNetwork.sol/TokenNetwork.json | jq -r '.bytecode.object')

# Constructor args: token address, maxDeposit (1M tokens), maxLifetime (365 days)
CONSTRUCTOR_ARGS=$(docker run --rm ghcr.io/foundry-rs/foundry:latest \
  cast abi-encode "constructor(address,uint256,uint256)" \
  "$TOKEN_ADDRESS" "1000000000000000000000000" "31536000")

DEPLOY_DATA="${BYTECODE}${CONSTRUCTOR_ARGS:2}"

echo "Sending deployment transaction..."
TX_HASH=$(docker run --rm --network crosstown_crosstown-network \
  ghcr.io/foundry-rs/foundry:latest \
  cast send --rpc-url http://anvil:8545 \
  --private-key $PRIVATE_KEY \
  --create "$DEPLOY_DATA" \
  --json | jq -r '.transactionHash')

echo "Transaction hash: $TX_HASH"

sleep 2
NETWORK_ADDRESS=$(docker run --rm --network crosstown_crosstown-network \
  ghcr.io/foundry-rs/foundry:latest \
  cast receipt $TX_HASH --rpc-url http://anvil:8545 --json | jq -r '.contractAddress')

echo "✅ TokenNetwork deployed to: $NETWORK_ADDRESS"
echo ""

echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo "AGENT Token:  $TOKEN_ADDRESS"
echo "TokenNetwork: $NETWORK_ADDRESS"
echo ""

# Restart services
echo "🔄 Restarting services..."
cd /Users/jonathangreen/Documents/crosstown
docker compose -f docker-compose-with-local.yml restart connector crosstown

echo "✅ Done! Payment channels should now be enabled."
