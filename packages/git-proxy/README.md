# @crosstown/git-proxy

ILP-Gated Git HTTP Proxy for Forgejo

## Overview

The Git Proxy sits in front of Forgejo and requires ILP (Interledger Protocol) payments for Git operations. This solves the "free rider" problem in Git hosting by making users pay small amounts for pushes and pulls.

## Architecture

```
Git Client → Git Proxy (ILP validation) → Forgejo
     │              │
     │              └→ BLS (payment validation)
     │
     └→ Pays via ILP before operation
```

## How It Works

1. **Client initiates Git operation** (clone, fetch, push)
2. **Proxy calculates price** based on operation type and data size
3. **Proxy returns 402 Payment Required** with price and payment details
4. **Client pays via ILP** and includes payment proof in `X-ILP-Payment-Proof` header
5. **Proxy validates payment** with BLS
6. **Proxy forwards request** to Forgejo
7. **Proxy streams response** back to client

## Pricing

| Operation | Base Price | Per KB | Notes |
|-----------|-----------|--------|-------|
| **info-refs** | FREE | - | Git discovery (required for all operations) |
| **clone/fetch** | 100 units | 10 units/KB | Read operations |
| **push** | 1000 units | 10 units/KB | Write operations (higher base price) |

Prices are configurable via environment variables.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GIT_PROXY_PORT` | `3002` | Port to listen on |
| `FORGEJO_URL` | *required* | Upstream Forgejo URL |
| `BLS_URL` | *required* | BLS endpoint for payment validation |
| `READ_PRICE` | `100` | Base price for read operations |
| `WRITE_PRICE` | `1000` | Base price for write operations |
| `PRICE_PER_KB` | `10` | Additional cost per kilobyte |
| `NODE_ID` | - | Optional node identifier |
| `VERBOSE` | `false` | Enable verbose logging |

## Docker Usage

### With docker-compose

```bash
docker compose -f docker-compose-with-local.yml up -d
```

The git-proxy service is automatically configured.

### Standalone

```bash
docker build -f packages/git-proxy/Dockerfile -t crosstown/git-proxy .

docker run -p 3002:3002 \
  -e FORGEJO_URL=http://forgejo:3000 \
  -e BLS_URL=http://crosstown:3100 \
  crosstown/git-proxy
```

## Git Client Integration

### Option 1: Manual Payment Header (testing)

```bash
# Get price quote
curl -I http://localhost:3003/user/repo.git/info/refs

# Make payment via ILP (implementation-specific)
PAYMENT_PROOF=$(ilp-pay --amount 100 --destination g.crosstown)

# Clone with payment proof
git clone \
  -c http.extraHeader="X-ILP-Payment-Proof: $PAYMENT_PROOF" \
  http://localhost:3003/user/repo.git
```

### Option 2: Git Credential Helper (recommended)

TODO: Create a Git credential helper that automatically handles ILP payments.

```bash
# Install helper
npm install -g @crosstown/git-helper

# Configure Git
git config --global credential.helper crosstown

# Clone - helper automatically pays
git clone http://localhost:3003/user/repo.git
```

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "git-proxy",
  "nodeId": "git-proxy",
  "upstreamUrl": "http://forgejo:3000"
}
```

### `*` (All Git HTTP paths)

Proxies Git HTTP protocol requests after validating payment.

**Payment Required Response (402):**
```json
{
  "error": "Payment required",
  "operation": "push",
  "repository": "my-repo",
  "price": "1500",
  "message": "Include X-ILP-Payment-Proof header with payment receipt"
}
```

## Development

### Build

```bash
pnpm --filter @crosstown/git-proxy build
```

### Run Locally

```bash
cd packages/git-proxy
FORGEJO_URL=http://localhost:3000 \
BLS_URL=http://localhost:3100 \
VERBOSE=true \
node dist/entrypoint.js
```

## Security Considerations

1. **Payment Validation**: All payments are validated with the BLS before proxying
2. **No Direct Forgejo Access**: Forgejo should not be exposed externally
3. **Free Discovery**: `info-refs` is free to prevent denial of service
4. **Rate Limiting**: TODO - add rate limiting to prevent abuse

## Future Enhancements

- [ ] Git SSH proxy (currently only HTTP)
- [ ] Git credential helper for automatic payments
- [ ] Payment streaming for large repositories
- [ ] WebSocket support for `git push --signed`
- [ ] Rate limiting and abuse prevention
- [ ] Payment receipts and accounting
- [ ] Anonymous payments via Lightning Network

## License

MIT
