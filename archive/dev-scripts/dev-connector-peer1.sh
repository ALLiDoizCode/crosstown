#!/bin/bash
# Start Connector Peer1 (Genesis) - Local Development

export CONFIG_FILE="$(pwd)/config/connector-peer1.yaml"
export LOG_LEVEL=info
export ENVIRONMENT=development

# Settlement (EVM)
export SETTLEMENT_ENABLED=true
export BASE_L2_RPC_URL=http://localhost:8545
export TOKEN_NETWORK_REGISTRY=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
export M2M_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
export TREASURY_EVM_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

# Explorer
export EXPLORER_ENABLED=true

cd ../connector/packages/connector
node dist/main.js
