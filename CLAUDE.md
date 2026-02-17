# Crosstown Protocol

A Nostr relay that solves the relay business model by also being an ILP connector that gates writes with micropayments.

## Project Overview

Crosstown is an ILP-gated Nostr relay. It bridges Nostr and Interledger Protocol (ILP), enabling:

1. **Peer Discovery via NIP-02**: Use Nostr follow lists to discover ILP peers
2. **SPSP over Nostr**: Exchange SPSP parameters via Nostr events instead of HTTPS
3. **ILP-Gated Writes**: Pay to write events, free to read — relay sustainability through micropayments
4. **Decentralized Connector Registry**: Publish and discover connector info via relays

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
                              │ populates
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
                              │ routes packets
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ILP Connector                             │
│                                                             │
│  - Routes packets (no Nostr knowledge)                      │
│  - Manages balances with configured peers                   │
│  - Settlement engines                                       │
└─────────────────────────────────────────────────────────────┘
```

## Event Kinds (Proposed NIPs)

| Kind | Name | Purpose |
|------|------|---------|
| `10032` | ILP Peer Info | Replaceable event with connector's ILP address, BTP endpoint, settlement info |
| `23194` | SPSP Request | NIP-44 encrypted request for fresh SPSP parameters |
| `23195` | SPSP Response | NIP-44 encrypted response with SPSP destination_account and shared_secret |

**Note:** SPSP uses encrypted request/response (kind:23194/23195) to securely exchange shared secrets. Static publishing was removed as it exposed secrets in plaintext.

## Key Design Decisions

### Social Graph = Network Graph
NIP-02 follows represent peering relationships. If Alice follows Bob, Alice trusts Bob to route payments.

### Nostr Populates, Doesn't Replace
The Nostr layer is for discovery and configuration. Actual packet routing uses local routing tables in the connector.

### Pay to Write, Free to Read
The relay gates EVENT writes with ILP micropayments, solving the relay sustainability problem. Reading via REQ/EVENT/EOSE is free.

### TOON-Native
Events are encoded in [TOON format](https://github.com/nicholasgasior/toon) throughout the stack — written as TOON in ILP packets, stored as TOON in the event store, and returned as TOON from the relay. TOON is the native wire format, designed for agent digestion rather than human readability.

### Discovery ≠ Peering
The RelayMonitor discovers new peers (kind:10032) and emits events, but does **not** automatically initiate peering. The `CrosstownNode` exposes `peerWith()` as a method so the caller can decide when and whether to peer. Discovery is passive observation; peering is an explicit decision.

## Development Guidelines

- Use `nostr-tools` for all Nostr operations
- All event kinds should be well-documented for potential NIP submission
- Keep ILP-specific logic separate from Nostr-specific logic
- Write tests that don't require live relays (mock SimplePool)

## Related Specifications

- [NIP-02: Follow List](https://github.com/nostr-protocol/nips/blob/master/02.md)
- [NIP-47: Nostr Wallet Connect](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [RFC 0009: Simple Payment Setup Protocol](https://interledger.org/developers/rfcs/simple-payment-setup-protocol/)
- [RFC 0032: Peering, Clearing and Settlement](https://interledger.org/developers/rfcs/peering-clearing-settling/)
