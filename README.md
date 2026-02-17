# Crosstown

A Nostr relay that solves the relay business model by also being an ILP connector that gates writes with micropayments.

Nodes publish their ILP connector info as Nostr events, discover each other through relays, negotiate settlement chains via encrypted SPSP handshakes, and open payment channels -- all without manual configuration.

## The Protocol

Three Nostr event kinds power the entire peering lifecycle:

| Kind | Name | What it does |
|------|------|-------------|
| **10032** | ILP Peer Info | Replaceable event advertising a node's ILP address, settlement chains, and token preferences |
| **23194** | SPSP Request | NIP-44 encrypted request to negotiate a payment channel (sent as ILP packet data) |
| **23195** | SPSP Response | NIP-44 encrypted response containing the negotiated chain, settlement address, and channel ID |

A new node joins the network in three phases:

```
Joiner                                    Genesis (accepts free SPSP)
  │                                           │
  │  1. DISCOVER: query relay for kind:10032  │
  │  ─────── Nostr WebSocket ───────────────> │
  │                                           │
  │  2. HANDSHAKE: send kind:23194 via ILP    │
  │  ─────── ILP packet routing ────────────> │
  │                                           │  negotiate chain
  │                                           │  open payment channel
  │                                           │  return channel ID
  │  <─────── ILP FULFILL ─────────────────── │
  │                                           │
  │  3. ANNOUNCE: send kind:10032 via ILP     │
  │  ─────── ILP packet (paid) ────────────> │
  │                                           │  store event
  │                                           │  return FULFILL
```

After bootstrap, a **RelayMonitor** watches the relay for new kind:10032 events and repeats the handshake with each newly discovered peer.

## Packages

| Package | Purpose |
|---------|---------|
| [`@crosstown/core`](packages/core) | Peer discovery, SPSP handshakes, settlement negotiation, and the `createCrosstownNode()` composition API |
| [`@crosstown/relay`](packages/relay) | Nostr relay with ILP payment gating -- pay to write, free to read |
| [`@crosstown/bls`](packages/bls) | Business Logic Server -- validates ILP payments and stores Nostr events |
| [`@crosstown/examples`](packages/examples) | Demo scripts for the ILP-gated relay |

## Two Modes

### Embedded Mode (npm library)

Use `createCrosstownNode()` to run everything in-process with zero network overhead. The connector's methods are called directly -- no HTTP.

```typescript
import { ConnectorNode } from '@crosstown/connector';
import { createCrosstownNode } from '@crosstown/core';
import { encodeEventToToon, decodeEventFromToon } from '@crosstown/relay';

const connector = new ConnectorNode(connectorConfig, logger);

const node = createCrosstownNode({
  connector,
  handlePacket,           // your incoming ILP packet handler
  secretKey,              // 32-byte Nostr secret key
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
  knownPeers: [{ pubkey: genesisPubkey, relayUrl, btpEndpoint }],
  settlementInfo,
  basePricePerByte: 10n,
});

// Listen to lifecycle events
node.bootstrapService.on((event) => console.log(event));
node.relayMonitor.on((event) => console.log(event));

// Start: discover peers, handshake, open channels, announce
const result = await node.start();
console.log(`${result.peerCount} peers, ${result.channelCount} channels`);

// Payment channel operations (requires @crosstown/connector >=1.2.0)
if (node.channelClient) {
  const state = await node.channelClient.getChannelState(channelId);
}
```

### Docker Mode (distributed)

Run the relay, BLS, and bootstrap as a container. Communicates with an external ILP connector via HTTP.

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
| 3100 | BLS HTTP -- receives ILP packets at `POST /handle-packet` |
| 7100 | Nostr relay WebSocket (NIP-01) |

## ILP-Gated Relay

The relay is a standard Nostr relay with one addition: **writing costs a micropayment**.

- Events are TOON-encoded (binary Nostr event) and sent as ILP packet data
- The BLS validates that `payment >= bytes * basePricePerByte`
- The relay owner's events bypass payment (self-write)
- SPSP requests (kind:23194) can have a lower minimum price for bootstrap
- Reading is free -- standard NIP-01 `REQ`/`EVENT`/`EOSE` over WebSocket

## Settlement

Nodes negotiate settlement on-chain during the SPSP handshake:

1. Both sides advertise supported chains (e.g., `evm:base:84532`)
2. `negotiateSettlementChain()` finds the best chain intersection
3. `resolveTokenForChain()` picks the token both prefer
4. `connector.openChannel()` opens a payment channel on-chain
5. The channel ID is included in the SPSP response

Chain identifiers use the format `{blockchain}:{network}:{chainId}` (e.g., `evm:base:84532`, `xrp:mainnet`).

## Peer Discovery

Peers are discovered from multiple sources:

1. **Known peers** -- passed directly via config (genesis nodes)
2. **ArDrive registry** -- peer list stored on Arweave
3. **Environment variable** -- `ADDITIONAL_PEERS` JSON
4. **Relay monitor** -- watches relay for new kind:10032 events in real-time

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm 8+
pnpm install
pnpm build
pnpm test

# Run the ILP-gated relay demo
pnpm demo:ilp-gated-relay
```

## Related Specs

- [NIP-02: Follow List](https://github.com/nostr-protocol/nips/blob/master/02.md) -- social graph for peer discovery
- [NIP-44: Encrypted Payloads](https://github.com/nostr-protocol/nips/blob/master/44.md) -- secures SPSP handshakes
- [SPSP (RFC 0009)](https://interledger.org/developers/rfcs/simple-payment-setup-protocol/) -- payment setup protocol
- [Peering, Clearing and Settlement (RFC 0032)](https://interledger.org/developers/rfcs/peering-clearing-settling/) -- ILP peering model

## License

MIT
