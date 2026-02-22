#!/bin/bash
# Start Crosstown Peer1 (Genesis) - Local Development

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
export M2M_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
export TOKEN_NETWORK_REGISTRY=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
export INITIAL_DEPOSIT=100000
export DATA_DIR=./data-peer1

cd packages/bls
node dist/entrypoint-with-bootstrap.js
