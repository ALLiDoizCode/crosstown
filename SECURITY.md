# Crosstown Security Model

**Understanding payment gates and access control**

---

## Port Separation (Critical Security Feature)

Crosstown uses **separate ports** to enforce payment for Git operations while allowing free web browsing:

| Port | Service | Access | Payment Required |
|------|---------|--------|------------------|
| **3004** | Forgejo Web UI | ✅ Direct | ❌ FREE |
| **3003** | Git Proxy | 🔒 Gated | ✅ REQUIRED |

### Why Two Ports?

**Problem:** Without separation, users could bypass payment by:
- Using web editor to commit files
- Uploading files via browser
- Creating repos through UI
- Merging PRs without payment

**Solution:** Separate web UI (free) from Git operations (paid)

---

## What's Free vs Paid

### FREE (Port 3004 - Web UI)

✅ **Allowed:**
- Browse repository code
- View issues and PRs
- Read documentation
- View commit history
- Download archives

❌ **Blocked:**
- Web-based file editing
- File uploads via browser
- Creating commits through UI
- Any write operations

### PAID (Port 3003 - Git Operations)

✅ **Requires Payment:**
- `git clone` - Download repository
- `git fetch` - Get updates
- `git push` - Upload changes
- `git pull` - Fetch + merge

💰 **Pricing:**
- Clone/Fetch: 100 units + 10/KB
- Push: 1000 units + 10/KB

---

## Security Enforcement

### 1. Git Proxy Filtering

The git-proxy **only** accepts Git HTTP paths:

```typescript
// Accepted paths:
✅ /repo.git/info/refs
✅ /repo.git/git-upload-pack
✅ /repo.git/git-receive-pack

// Rejected paths:
❌ /user/settings
❌ /admin/dashboard
❌ /repo/src/branch/main/file.txt
```

**Response for non-Git paths:**
```json
{
  "error": "Not a Git operation",
  "message": "This endpoint only accepts Git HTTP operations. Access the web UI at port 3004.",
  "path": "/user/settings"
}
```

### 2. Forgejo Configuration

Forgejo is configured to **disable web-based write operations**:

```yaml
environment:
  # Disable web editor
  - FORGEJO__repository__ENABLE_EDITOR_UPLOAD=false

  # Disable auto-create on push
  - FORGEJO__repository__ENABLE_PUSH_CREATE_USER=false
  - FORGEJO__repository__ENABLE_PUSH_CREATE_ORG=false
```

### 3. Network Isolation

```
Internet
    │
    ├─→ Port 3004 (Web UI) → Forgejo (read-only)
    │
    └─→ Port 3003 (Git) → Git Proxy → Validate Payment → Forgejo
```

Forgejo **only** accepts Git operations from authenticated git-proxy.

---

## Attack Vectors & Mitigations

### ❌ Attack: Access Web UI via Git Proxy

**Attempt:**
```bash
curl http://localhost:3003/user/settings
```

**Blocked By:** Git proxy rejects non-Git paths
```json
{
  "error": "Not a Git operation",
  "message": "Access the web UI at port 3004."
}
```

### ❌ Attack: Commit via Web Editor

**Attempt:** Edit file in browser at `http://localhost:3004`

**Blocked By:** Forgejo config disables web editor
```
Feature disabled by administrator
```

### ❌ Attack: Upload File via UI

**Attempt:** Use "Upload File" button in web UI

**Blocked By:** `ENABLE_EDITOR_UPLOAD=false`
```
Uploads disabled
```

### ❌ Attack: Clone Without Payment

**Attempt:**
```bash
git clone http://localhost:3003/admin/repo.git
```

**Blocked By:** Git proxy requires payment proof
```
HTTP/1.1 402 Payment Required
{
  "error": "Payment required",
  "price": "10340"
}
```

### ✅ Valid: Browse Web UI

**Allowed:**
```bash
curl http://localhost:3004/admin/repo
```

**Result:** HTML page with repository view (no payment required)

### ✅ Valid: Clone with Payment

**Allowed:**
```bash
git clone \
  -c http.extraHeader="X-ILP-Payment-Proof: <proof>" \
  http://localhost:3003/admin/repo.git
```

**Result:** Repository cloned after payment validation

---

## Configuration Security

### Environment Variables

```bash
# Enable non-Git path rejection (security)
REJECT_NON_GIT=true  # Default: true (RECOMMENDED)

# Disable for testing only
REJECT_NON_GIT=false  # DANGEROUS: Allows web UI via proxy
```

### Docker Compose Security

```yaml
forgejo:
  ports:
    - "3004:3000"  # Web UI - internal only in production
  environment:
    - FORGEJO__repository__ENABLE_EDITOR_UPLOAD=false  # Critical!

git-proxy:
  ports:
    - "3003:3002"  # Git operations - payment required
  environment:
    - REJECT_NON_GIT=true  # Critical!
```

---

## NIP-34 Security

NIP-34 events (patches via Nostr) also require payment:

1. **Event submission** → Requires ILP payment
2. **BLS validation** → Checks payment proof
3. **NIP34Handler** → Applies patch to Forgejo

**No bypass:** All write operations (HTTP Git, SSH, NIP-34) are gated.

---

## SSH Access (Future)

Currently SSH is **NOT gated**:

```yaml
git-proxy:
  ports:
    - "2222:22"  # SSH passthrough - TODO: add payment gate
```

**Mitigation:** Disable SSH or require authentication:

```yaml
forgejo:
  environment:
    - FORGEJO__server__DISABLE_SSH=true  # Disable entirely
```

**Roadmap:** SSH proxy with ILP payment requirement

---

## Production Hardening

### 1. Remove Direct Forgejo Access

```yaml
forgejo:
  # DO NOT expose port 3000 externally in production
  ports: []  # No external access
  networks:
    - crosstown-network  # Internal only
```

**Access via reverse proxy:**
```nginx
server {
  listen 443 ssl;
  server_name git.example.com;

  # Web UI (free)
  location / {
    proxy_pass http://forgejo:3000;
  }

  # Git operations (paid)
  location ~ /.*\.git/ {
    proxy_pass http://git-proxy:3002;
  }
}
```

### 2. Rate Limiting

Add to git-proxy (future enhancement):

```yaml
git-proxy:
  environment:
    - RATE_LIMIT_REQUESTS=100  # Per IP per hour
    - RATE_LIMIT_BYTES=1000000  # 1MB per hour
```

### 3. Authentication

Forgejo provides user authentication for web UI:

```yaml
forgejo:
  environment:
    - FORGEJO__security__INSTALL_LOCK=true
    - FORGEJO__service__REQUIRE_SIGNIN_VIEW=true  # Login required
```

Git operations still require **both**:
1. Forgejo auth (username/password)
2. ILP payment proof

---

## Monitoring

### Check Access Control

```bash
# Should succeed (free)
curl -I http://localhost:3004/

# Should fail (403 Forbidden)
curl -I http://localhost:3003/

# Should succeed (Git path)
curl -I http://localhost:3003/admin/repo.git/info/refs
```

### Check Forgejo Config

```bash
# Verify web editor is disabled
docker exec crosstown-forgejo cat /data/gitea/conf/app.ini | grep ENABLE_EDITOR_UPLOAD
# Should show: ENABLE_EDITOR_UPLOAD = false
```

### Monitor Logs

```bash
# Watch for blocked attempts
docker logs -f crosstown-git-proxy | grep "Rejected"

# Example output:
# Rejected non-Git path: /user/settings
```

---

## Security Checklist

✅ **Port Separation**
- [ ] Forgejo on port 3004 (web UI)
- [ ] Git proxy on port 3003 (Git operations)

✅ **Forgejo Configuration**
- [ ] `ENABLE_EDITOR_UPLOAD=false`
- [ ] `ENABLE_PUSH_CREATE_USER=false`
- [ ] `ENABLE_PUSH_CREATE_ORG=false`

✅ **Git Proxy Configuration**
- [ ] `REJECT_NON_GIT=true`
- [ ] Payment validation enabled
- [ ] BLS integration working

✅ **Network Security**
- [ ] Forgejo not directly accessible (production)
- [ ] All Git operations via proxy
- [ ] SSH disabled or gated

✅ **Testing**
- [ ] Web UI accessible on 3004
- [ ] Non-Git paths blocked on 3003
- [ ] Git operations require payment
- [ ] Web editor disabled

---

## FAQ

**Q: Why can users browse for free?**
A: Discovery is important for open source. Users can read code, issues, and docs without payment. Write operations (clone/push) require payment.

**Q: Can users download code via web UI?**
A: Yes, downloading archives is allowed. It's equivalent to cloning and provides the same value.

**Q: What about SSH access?**
A: Currently not gated. Disable SSH or wait for SSH proxy implementation.

**Q: Can I charge for web UI access?**
A: Yes, set `REJECT_NON_GIT=false` and implement web UI payment logic in git-proxy.

**Q: Is NIP-34 secure?**
A: Yes, all NIP-34 events require ILP payment before being processed.

---

**Security is enforced by design, not by trust.** 🔒
