#!/bin/bash
# Start Connector Peer2 (Joiner) - Local Development

export CONFIG_FILE="$(pwd)/config/connector-peer2.yaml"
export LOG_LEVEL=info
export ENVIRONMENT=development

# Settlement (EVM)
export SETTLEMENT_ENABLED=true
export BASE_L2_RPC_URL=http://localhost:8545
export TOKEN_NETWORK_REGISTRY=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
export M2M_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
export TREASURY_EVM_PRIVATE_KEY=0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6

# Explorer
export EXPLORER_ENABLED=true

cd ../connector/packages/connector
node dist/main.js
