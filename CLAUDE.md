# Crosstown Protocol

An ILP-gated Nostr relay that solves the relay sustainability problem through micropayments. Pay to write, free to read.

Crosstown bridges Nostr and Interledger Protocol (ILP) to enable:
- **Peer Discovery via NIP-02**: Social graphs become payment routing networks
- **SPSP over Nostr**: Exchange payment parameters via Nostr events (no HTTPS required)
- **Payment Channels**: Automatic on-chain channel creation with off-chain settlement
- **ILP-Gated Writes**: Sustainable relay business model through pay-per-event micropayments
- **TOON-Native**: Events encoded in TOON format for efficient agent digestion

**Quick Start**: Deploy a genesis node in 2 minutes → [Getting Started](#getting-started)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               @crosstown/core (library)                     │
│                                                             │
│  - NostrPeerDiscovery: NIP-02 → peer list                   │
│  - NostrSpspClient: SPSP over Nostr events                  │
│  - BootstrapService: join network, handshake, announce      │
│  - Event kinds for ILP peering (kind:10032, kind:23194/95)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            @crosstown/relay + @crosstown/bls                │
│                                                             │
│  - Nostr relay (NIP-01 WebSocket)                           │
│  - BLS validates ILP payments, stores events                │
│  - TOON-native: events stored and served in TOON format     │
│  - Pay to write, free to read                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ILP Connector                             │
│                                                             │
│  - Routes packets (no Nostr knowledge)                      │
│  - Manages balances with configured peers                   │
│  - Settlement via payment channels                          │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow**:
1. Client subscribes to relay (free)
2. Client sends EVENT with ILP payment (paid)
3. BLS validates payment, stores event
4. Other clients query events (free)

---

## Event Kinds

| Kind | Name | Purpose |
|------|------|---------|
| `10032` | ILP Peer Info | Replaceable event with connector's ILP address, BTP endpoint, settlement info |
| `23194` | SPSP Request | NIP-44 encrypted request for SPSP parameters |
| `23195` | SPSP Response | NIP-44 encrypted response with SPSP destination and shared secret |

**Note**: These are proposed NIPs. SPSP uses encrypted request/response to securely exchange shared secrets.

---

## Key Design Decisions

### Social Graph = Network Graph
NIP-02 follows represent peering relationships. If Alice follows Bob, Alice trusts Bob to route payments.

### Nostr Populates, Doesn't Replace
Nostr is for discovery and configuration. Actual packet routing uses local routing tables in the connector. Discovery ≠ Peering.

### Pay to Write, Free to Read
The relay gates EVENT writes with ILP micropayments, solving relay sustainability. Reading via REQ/EVENT/EOSE is free.

### TOON-Native
Events are encoded in [TOON format](https://github.com/nicholasgasior/toon) throughout the stack. TOON is the native wire format, designed for agent digestion rather than human readability.

### Payment Channels for Settlement
Bootstrap automatically creates on-chain payment channels:
- **SPSP Negotiation**: Exchange settlement parameters (chain, token, addresses)
- **Channel Creation**: Happens BEFORE SPSP handshake (fixed as of 2026-02-26)
- **TokenNetwork Integration**: Uses TokenNetworkRegistry for per-token channels
- **Off-chain Payments**: Signed balance proofs settle on-chain
- **Nonce Management**: Retry logic handles blockchain conflicts gracefully

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for running tests)
- Connector contracts repository cloned to `../connector`

### Deploy Genesis Node

```bash
./deploy-genesis-node.sh
```

This deploys:
- Anvil (local blockchain with payment channel contracts)
- Token Faucet (ETH + AGENT token distribution)
- ILP Connector (packet routing + settlement)
- Crosstown Node (Nostr relay + BLS)

**Service Endpoints**:
- Faucet: http://localhost:3500
- Relay: ws://localhost:7100
- BLS: http://localhost:3100
- Connector: http://localhost:8080

### Verify Deployment

```bash
cd packages/client
pnpm test:e2e genesis-bootstrap-with-channels
```

This E2E test verifies:
- Bootstrap with payment channel creation
- Signed balance proof generation
- Event publishing with ILP payment
- On-chain channel state validation

### Deploy Peer Nodes

```bash
./deploy-peers.sh 3  # Deploy 3 peer nodes
```

---

## Contract Addresses (Anvil)

Deterministic addresses from `DeployLocal.s.sol`:
- **AGENT Token**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **TokenNetworkRegistry**: `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`
- **TokenNetwork (AGENT)**: `0xCafac3dD18aC6c6e92c921884f9E4176737C052c` (created by registry)

---

## Project Structure

```
crosstown/
├── packages/
│   ├── client/       # Client SDK with payment channel support
│   ├── core/         # Shared protocol logic
│   ├── relay/        # Nostr relay + TOON encoding
│   ├── bls/          # Business Logic Server (payment validation)
│   └── faucet/       # Token distribution for testing
├── docker/           # Container entrypoint
├── deploy-genesis-node.sh    # Genesis deployment
└── deploy-peers.sh           # Peer deployment
```

---

## Troubleshooting

**Genesis node won't start?**
1. Check Docker is running: `docker ps`
2. Verify connector contracts exist: `ls ../connector/packages/contracts`
3. Check logs: `docker logs crosstown-node`

**Tests failing?**
1. Ensure genesis node is running: `curl http://localhost:3100/health`
2. Verify Anvil is healthy: `curl http://localhost:8545`
3. Check for stale containers: `./deploy-genesis-node.sh --reset`

**For detailed documentation**: See `/docs/` directory

---

## Development

- **Monorepo**: Uses pnpm workspaces
- **Build**: `pnpm -r build` (builds all packages)
- **Test**: `cd packages/client && pnpm test:e2e`
- **Logs**: `docker compose -p crosstown-genesis logs -f crosstown`

---

## Related Specifications

- [NIP-02: Follow List](https://github.com/nostr-protocol/nips/blob/master/02.md)
- [RFC 0009: Simple Payment Setup Protocol](https://interledger.org/developers/rfcs/simple-payment-setup-protocol/)
- [RFC 0032: Peering, Clearing and Settlement](https://interledger.org/developers/rfcs/peering-clearing-settling/)
- [TOON Format](https://github.com/nicholasgasior/toon)
