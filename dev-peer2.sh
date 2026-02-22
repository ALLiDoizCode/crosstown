#!/bin/bash
# Start Crosstown Peer2 (Joiner) - Local Development

export NODE_ID=peer2
export NOSTR_SECRET_KEY=b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3
export ILP_ADDRESS=g.crosstown.peer2
export CONNECTOR_ADMIN_URL=http://localhost:8092
export CONNECTOR_URL=http://localhost:8082
export BTP_ENDPOINT=btp+ws://localhost:3052
export BLS_PORT=3102
export WS_PORT=7102
export BASE_PRICE_PER_BYTE=10
export PEER_EVM_ADDRESS=0x90F79bf6EB2c4f870365E785982E1f101E93b906
export M2M_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
export TOKEN_NETWORK_REGISTRY=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
export INITIAL_DEPOSIT=100000
export DATA_DIR=./data-peer2
export BOOTSTRAP_RELAYS=ws://localhost:7101
export BOOTSTRAP_PEERS=719705df863f0190e0c124bbb11dd84b6374d077f66c4912a039324c98dc25e3

cd packages/bls
node dist/entrypoint-with-bootstrap.js
