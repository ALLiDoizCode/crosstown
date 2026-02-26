#!/bin/bash
# Deploy Crosstown Peer Node
#
# This script deploys a peer node that bootstraps from the genesis node.
# It automatically:
# - Assigns an Anvil account to the peer
# - Funds the wallet with AGENT tokens
# - Configures bootstrap settings
# - Starts the peer node
#
# Usage:
#   ./deploy-peer-node.sh <peer-number>
#
# Example:
#   ./deploy-peer-node.sh 1  # Uses Anvil Account #2
#   ./deploy-peer-node.sh 2  # Uses Anvil Account #3

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

log_header() {
    echo -e "\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Parse peer number
PEER_NUM="${1:-}"

if [ -z "$PEER_NUM" ]; then
    log_error "Usage: $0 <peer-number>"
    echo ""
    echo "Example:"
    echo "  $0 1  # Deploy peer-1 using Anvil Account #2"
    echo "  $0 2  # Deploy peer-2 using Anvil Account #3"
    echo ""
    echo "Available peer slots: 1-8 (uses Anvil accounts #2-#9)"
    exit 1
fi

# Validate peer number
if ! [[ "$PEER_NUM" =~ ^[1-8]$ ]]; then
    log_error "Peer number must be between 1 and 8"
    exit 1
fi

# Anvil accounts (well-known private keys and addresses)
declare -A ANVIL_ACCOUNTS
ANVIL_ACCOUNTS[1]="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC:0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
ANVIL_ACCOUNTS[2]="0x90F79bf6EB2c4f870365E785982E1f101E93b906:0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
ANVIL_ACCOUNTS[3]="0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65:0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
ANVIL_ACCOUNTS[4]="0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc:0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
ANVIL_ACCOUNTS[5]="0x976EA74026E726554dB657fA54763abd0C3a0aa9:0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"
ANVIL_ACCOUNTS[6]="0x14dC79964da2C08b23698B3D3cc7Ca32193d9955:0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
ANVIL_ACCOUNTS[7]="0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f:0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
ANVIL_ACCOUNTS[8]="0xa0Ee7A142d267C1f36714E4a8F75612F20a79720:0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"

# Get account for this peer
IFS=':' read -r PEER_ADDRESS PEER_PRIVATE_KEY <<< "${ANVIL_ACCOUNTS[$PEER_NUM]}"
ACCOUNT_NUM=$((PEER_NUM + 1))  # Anvil account numbers (Account #2 = Peer 1)

# Configuration
PEER_ID="peer-${PEER_NUM}"
ILP_ADDRESS="g.crosstown.peer${PEER_NUM}"
FUNDING_AMOUNT=50000  # AGENT tokens

# Banner
clear
log_header "Deploy Crosstown Peer Node #${PEER_NUM}"

echo -e "${BOLD}Peer Configuration:${NC}"
echo "  Peer ID:       $PEER_ID"
echo "  ILP Address:   $ILP_ADDRESS"
echo "  EVM Address:   $PEER_ADDRESS"
echo "  Anvil Account: #$ACCOUNT_NUM"
echo ""

# Check if genesis node is running
log_info "Checking genesis node..."

if ! curl -sf http://localhost:3100/health &>/dev/null; then
    log_error "Genesis node is not running"
    log_info "Start it with: ./deploy-genesis-node.sh"
    exit 1
fi

log_success "Genesis node is running"

# Load genesis node info
if [ ! -f "genesis.env" ]; then
    log_error "genesis.env not found"
    log_info "Deploy the genesis node first: ./deploy-genesis-node.sh"
    exit 1
fi

source genesis.env

log_success "Loaded genesis node configuration"

# Fund peer wallet
log_header "Funding Peer Wallet"

log_info "Transferring $FUNDING_AMOUNT AGENT tokens to peer wallet..."
./fund-peer-wallet.sh "$PEER_ADDRESS" "$FUNDING_AMOUNT"

# Generate Nostr keypair
log_header "Generating Nostr Identity"

NOSTR_SECRET=$(openssl rand -hex 32)
log_success "Generated Nostr secret key"

# Create peer .env file
PEER_ENV=".env.peer${PEER_NUM}"

log_info "Creating peer configuration: $PEER_ENV"

cat > "$PEER_ENV" << EOF
# Crosstown Peer Node #${PEER_NUM} Configuration
# Generated: $(date)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Peer Identity
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NODE_ID=$PEER_ID
NOSTR_SECRET_KEY=$NOSTR_SECRET
ILP_ADDRESS=$ILP_ADDRESS

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Bootstrap from Genesis Node
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BOOTSTRAP_RELAYS=${GENESIS_RELAY}

# Genesis peer to bootstrap from
BOOTSTRAP_PEERS=[{"pubkey":"${GENESIS_NOSTR_PUBKEY}","ilpAddress":"${GENESIS_ILP_ADDRESS}","btpEndpoint":"${GENESIS_BTP_ENDPOINT}","relay":"${GENESIS_RELAY}"}]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Network Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BTP_ENDPOINT=ws://connector-peer${PEER_NUM}:3000

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pricing
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BASE_PRICE_PER_BYTE=10
SPSP_MIN_PRICE=5
ASSET_CODE=USD
ASSET_SCALE=6

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Payment Channels (Anvil Local)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Token contracts (same as genesis)
BASE_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
M2M_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
BASE_REGISTRY_ADDRESS=0xe7f1725e7734ce288f8367e1bb143e90bb3f0512

# Peer wallet (Anvil Account #$ACCOUNT_NUM)
PEER_EVM_ADDRESS=$PEER_ADDRESS
TREASURY_EVM_PRIVATE_KEY=$PEER_PRIVATE_KEY

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Service Ports (offset by peer number to avoid conflicts)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BLS_PORT=$((3100 + PEER_NUM * 10))
WS_PORT=$((7100 + PEER_NUM * 10))
CONNECTOR_PORT=$((3000 + PEER_NUM * 10))
CONNECTOR_HEALTH_PORT=$((8080 + PEER_NUM * 10))
CONNECTOR_ADMIN_PORT=$((8081 + PEER_NUM * 10))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Discovery
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ARDRIVE_ENABLED=true
EOF

log_success "Peer configuration saved to $PEER_ENV"

# Success message
log_header "Peer Node Ready! 🎉"

cat << EOF

${BOLD}Peer #${PEER_NUM} Configuration:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Node ID:          ${CYAN}$PEER_ID${NC}
  ILP Address:      ${CYAN}$ILP_ADDRESS${NC}
  EVM Address:      ${CYAN}$PEER_ADDRESS${NC}
  Token Balance:    ${CYAN}$FUNDING_AMOUNT AGENT${NC}


${BOLD}Service Endpoints:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BLS API:          ${CYAN}http://localhost:$((3100 + PEER_NUM * 10))${NC}
  Nostr Relay:      ${CYAN}ws://localhost:$((7100 + PEER_NUM * 10))${NC}
  Connector Health: ${CYAN}http://localhost:$((8080 + PEER_NUM * 10))${NC}


${BOLD}Next Steps:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${BOLD}1. Start the peer node:${NC}
     Create a docker-compose file for this peer using $PEER_ENV
     Or run manually with the connector

  ${BOLD}2. Verify bootstrap:${NC}
     curl http://localhost:$((3100 + PEER_NUM * 10))/health | jq
     # Check bootstrapPhase and peerCount

  ${BOLD}3. Check payment channel:${NC}
     curl http://localhost:$((8081 + PEER_NUM * 10))/admin/channels | jq


${BOLD}Configuration Files:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Peer Config:      ${BOLD}$PEER_ENV${NC}
  Genesis Config:   ${BOLD}genesis.env${NC}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

log_success "Peer node #${PEER_NUM} is configured and funded!"
echo ""
log_info "See the multi-peer docker-compose examples for starting multiple peers:"
echo "  docker-compose-multi-peer.yml"
