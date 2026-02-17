# Crosstown

An ILP-gated Nostr relay that solves relay sustainability through micropayments: **pay to write, free to read**.

Crosstown bridges Nostr and Interledger Protocol (ILP) to create a self-sustaining relay network where nodes publish connector info as Nostr events, discover peers through relays, and negotiate payment channels via encrypted SPSP handshakes — all without manual configuration.

## How It Works

Three Nostr event kinds enable the full lifecycle:

| Kind | Name | Purpose |
|------|------|---------|
| **10032** | ILP Peer Info | Replaceable event advertising a node's ILP address, settlement chains, and token preferences |
| **23194** | SPSP Request | NIP-44 encrypted request to negotiate a payment channel (sent as ILP packet data) |
| **23195** | SPSP Response | NIP-44 encrypted response with negotiated chain, settlement address, and channel ID |

### Network Bootstrap

A new node joins in three phases:

```
Joiner                                    Genesis Node
  │                                           │
  │  1. DISCOVER: query relay for kind:10032  │
  │  ─────── Nostr WebSocket ───────────────> │
  │                                           │
  │  2. HANDSHAKE: send kind:23194 via ILP    │
  │  ─────── ILP packet routing ────────────> │
  │                                           │  negotiate settlement chain
  │                                           │  open payment channel
  │                                           │  return channel ID
  │  <─────── ILP FULFILL ─────────────────── │
  │                                           │
  │  3. ANNOUNCE: send kind:10032 via ILP     │
  │  ─────── ILP packet (paid) ────────────> │
  │                                           │  store event
  │                                           │  return FULFILL
```

**Passive Discovery:** After bootstrap, the RelayMonitor continuously watches for new kind:10032 events. Discovery is automatic, but peering (registration + SPSP handshake) only happens when explicitly triggered via `peerWith()`. This separation prevents unwanted automatic peering while maintaining real-time peer awareness.

## Architecture

Crosstown is structured as a modular monorepo:

| Package | Purpose |
|---------|---------|
| **[@crosstown/core](packages/core)** | Peer discovery, SPSP handshakes, settlement negotiation, and the `createCrosstownNode()` composition API |
| **[@crosstown/relay](packages/relay)** | Nostr relay server (NIP-01 WebSocket) with event propagation via `RelaySubscriber` |
| **[@crosstown/bls](packages/bls)** | Business Logic Server validates ILP payments and stores TOON-encoded Nostr events |
| **[@crosstown/examples](packages/examples)** | Demo scripts showing the ILP-gated relay in action |

### Data Flow

```
Nostr Client                     Crosstown Relay                    ILP Network
     │                                  │                                 │
     │  REQ (read events)              │                                 │
     │ ───────────────────────────────>│  Free access                   │
     │ <─────────────────────────────  │                                 │
     │                                  │                                 │
     │  EVENT (write)                   │                                 │
     │ ──────────────────────────────X  │  Requires payment               │
     │                                  │                                 │
     │  Send ILP payment                │                                 │
     │ ───────────────────────────────> │ ─────────────────────────────> │
     │                   (TOON-encoded event as ILP packet data)          │
     │                                  │                                 │
     │                                  │  BLS validates:                 │
     │                                  │  - payment >= bytes * price     │
     │                                  │  - event signature valid        │
     │                                  │  - TOON decoding succeeds       │
     │                                  │                                 │
     │                                  │  Store event                    │
     │                                  │  Generate fulfillment           │
     │                                  │                                 │
     │  ILP FULFILL                     │                                 │
     │ <─────────────────────────────── │ <───────────────────────────── │
```

## Deployment Modes

### Embedded Mode (Library)

Use `createCrosstownNode()` for in-process deployment with zero HTTP overhead. The connector methods are called directly.

```typescript
import { createCrosstownNode } from '@crosstown/core';
import { encodeEventToToon, decodeEventFromToon } from '@crosstown/relay';

const node = createCrosstownNode({
  connector,              // EmbeddableConnectorLike instance
  handlePacket,           // ILP packet handler function
  secretKey,              // 32-byte Nostr secret key (Uint8Array)
  ilpInfo: {
    ilpAddress: 'g.agent.peer1',
    btpEndpoint: 'btp+ws://localhost:3000',
    assetCode: 'USD',
    assetScale: 6,
    supportedChains: ['evm:base:84532'],
    settlementAddresses: { 'evm:base:84532': '0x6AFbC4...' },
    preferredTokens: { 'evm:base:84532': '0x39eaF9...' },
    tokenNetworks: { 'evm:base:84532': '0x733b89...' },
  },
  toonEncoder: encodeEventToToon,
  toonDecoder: decodeEventFromToon,
  relayUrl: 'ws://relay.example.com',
  knownPeers: [{ pubkey, relayUrl, btpEndpoint }],
  settlementInfo,
  basePricePerByte: 10n,
});

// Subscribe to lifecycle events
node.bootstrapService.on((event) => console.log(event));
node.relayMonitor.on((event) => console.log(event));

// Bootstrap: discover peers, handshake genesis, announce self
const result = await node.start();
console.log(`Connected to ${result.peerCount} peers, opened ${result.channelCount} channels`);

// Explicit peering with discovered peers
const discovered = node.relayMonitor.getDiscoveredPeers();
for (const peer of discovered) {
  await node.peerWith(peer.pubkey);
}
```

### Docker Mode (Standalone)

Run as a containerized service. The BLS receives ILP packets via HTTP `POST /handle-packet`.

```bash
docker build -f docker/Dockerfile -t crosstown .
docker run -p 3100:3100 -p 7100:7100 \
  -e NOSTR_SECRET_KEY=<64-char-hex> \
  -e ILP_ADDRESS=g.agent.peer1 \
  -e BTP_ENDPOINT=ws://connector:3000 \
  -e AGENT_RUNTIME_URL=http://connector:8081 \
  -e SUPPORTED_CHAINS=evm:base:84532 \
  -e SETTLEMENT_ADDRESS_evm_base_84532=0x6AFbC4... \
  crosstown
```

| Port | Service |
|------|---------|
| **3100** | BLS HTTP — receives ILP packets at `POST /handle-packet` |
| **7100** | Nostr relay WebSocket (NIP-01) |

## Key Design Decisions

### Pay to Write, Free to Read

The relay gates EVENT writes with ILP micropayments, solving relay sustainability. Reading via `REQ`/`EVENT`/`EOSE` is free.

**How it works:**
- Events are TOON-encoded and sent as ILP packet data
- BLS validates: `payment >= bytes * basePricePerByte`
- Relay owner's events bypass payment (self-write privilege)
- SPSP requests (kind:23194) can have lower minimum pricing for bootstrap

### TOON-Native Format

Events flow through the system in [TOON format](https://github.com/nicholasgasior/toon) — a binary encoding designed for efficient agent processing rather than human readability.

**Lifecycle:**
1. Client TOON-encodes event → sends as ILP packet data
2. BLS validates payment → decodes TOON → validates event signature
3. Event stored as TOON in EventStore
4. Relay serves events as TOON to subscribers
5. Upstream relay propagation via RelaySubscriber

TOON is the **native wire format** — no JSON conversion overhead in the hot path.

### Passive Discovery, Explicit Peering

**Discovery** (automatic): RelayMonitor watches for kind:10032 events and maintains a map of discovered peers.

**Peering** (explicit): Calling `node.peerWith(pubkey)` triggers:
1. Connector peer registration
2. SPSP handshake (encrypted kind:23194/23195)
3. Settlement chain negotiation
4. Payment channel opening

This separation prevents unwanted automatic connections while maintaining real-time network awareness.

### Settlement Negotiation

During the SPSP handshake, nodes negotiate on-chain settlement:

1. Both sides advertise supported chains in their kind:10032 events
2. `negotiateSettlementChain()` finds optimal chain intersection
3. `resolveTokenForChain()` selects the token both prefer
4. `connector.openChannel()` opens a payment channel on-chain
5. Channel ID is returned in the SPSP response (kind:23195)

**Chain format:** `{blockchain}:{network}:{chainId}`
Examples: `evm:base:84532`, `evm:sepolia:11155111`, `xrp:mainnet`

### Peer Discovery Sources

Peers are discovered from multiple sources:

| Source | Type | Purpose |
|--------|------|---------|
| **Known peers** | Config | Genesis nodes for bootstrap |
| **ArDrive registry** | Arweave | Decentralized peer list |
| **Environment variable** | `ADDITIONAL_PEERS` JSON | Runtime peer injection |
| **RelayMonitor** | Real-time subscription | Continuous discovery of new kind:10032 events |

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm 8+
pnpm install
pnpm build
pnpm test

# Run the ILP-gated relay demo
cd packages/examples
pnpm demo:ilp-gated-relay
```

### Development Guidelines

- Use `nostr-tools` for all Nostr operations
- Keep ILP-specific logic separate from Nostr-specific logic
- Write tests that don't require live relays (mock `SimplePool`)
- Follow the passive discovery pattern — observe, don't auto-connect

## Proposed NIPs

Crosstown introduces three new event kinds for ILP peering:

- **Kind 10032:** ILP Peer Info (replaceable event advertising connector details)
- **Kind 23194:** SPSP Request (NIP-44 encrypted payment setup request)
- **Kind 23195:** SPSP Response (NIP-44 encrypted payment setup response)

These are designed for potential submission as Nostr Improvement Proposals.

## Related Specifications

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md) — Base Nostr relay protocol
- [NIP-44: Encrypted Payloads](https://github.com/nostr-protocol/nips/blob/master/44.md) — Secures SPSP handshakes
- [SPSP (RFC 0009)](https://interledger.org/developers/rfcs/simple-payment-setup-protocol/) — Simple Payment Setup Protocol
- [Peering, Clearing and Settlement (RFC 0032)](https://interledger.org/developers/rfcs/peering-clearing-settling/) — ILP peering model
- [TOON Encoding Spec](https://github.com/nicholasgasior/toon) — Binary Nostr event format

## License

MIT
