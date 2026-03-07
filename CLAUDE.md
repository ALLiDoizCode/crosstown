# Crosstown Protocol

ILP-gated Nostr relay. Pay to write, free to read.

> **All coding rules, patterns, conventions, and architecture details are in `_bmad-output/project-context.md`** -- loaded automatically by BMAD workflows. This file covers only setup, operational commands, and troubleshooting.

---

## Quick Reference

```bash
# Build & Test
pnpm install && pnpm build && pnpm test

# Lint & Format
pnpm lint && pnpm format

# Deploy genesis stack (Anvil + Faucet + Connector + Node)
./deploy-genesis-node.sh

# Deploy peer nodes
./deploy-peers.sh 3
```

---

## Prerequisites

- Docker & Docker Compose
- Node.js >=20
- pnpm 8.15.0 (`corepack enable && corepack prepare pnpm@8.15.0 --activate`)
- Connector contracts repo cloned at `../connector` (required for genesis deployment)

---

## Deployment Verification

```bash
# Health checks
curl http://localhost:3100/health   # BLS
curl http://localhost:8545           # Anvil
curl http://localhost:3500           # Faucet

# Full E2E validation (requires running genesis node)
cd packages/client && pnpm test:e2e genesis-bootstrap-with-channels

# View logs
docker compose -p crosstown-genesis logs -f crosstown
```

---

## Troubleshooting

**Genesis node won't start:**
1. `docker ps` -- Docker daemon running?
2. `ls ../connector/packages/contracts` -- Contracts repo cloned at correct path?
3. `docker logs crosstown-node` -- Check container logs for errors

**Tests failing:**
1. `curl http://localhost:3100/health` -- Genesis node up?
2. `curl http://localhost:8545` -- Anvil healthy?
3. `./deploy-genesis-node.sh --reset` -- Clear stale containers and rebuild
