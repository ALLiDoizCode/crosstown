#!/usr/bin/env bash
# Setup Forgejo Admin Token for Crosstown BLS
#
# This script creates a Forgejo admin user and generates an API token
# that the Crosstown BLS uses to apply NIP-34 events (patches, PRs, issues).
#
# Usage:
#   ./setup-forgejo-token.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo -e "\n${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Check if Forgejo is running
if ! docker ps | grep -q crosstown-forgejo; then
    log_error "Forgejo container is not running"
    log_info "Start it with: docker compose -f docker-compose-read-only-git.yml up -d forgejo"
    exit 1
fi

log_header "Forgejo Admin Token Setup"

# Step 1: Check if admin user exists
log_info "Checking for existing admin user..."

ADMIN_EXISTS=$(docker exec crosstown-forgejo forgejo admin user list 2>/dev/null | grep -c "crosstown" || echo "0")

if [ "$ADMIN_EXISTS" = "0" ]; then
    log_info "Creating admin user 'crosstown'..."

    # Prompt for password
    read -sp "Enter password for admin user: " ADMIN_PASSWORD
    echo

    if [ -z "$ADMIN_PASSWORD" ]; then
        log_error "Password cannot be empty"
        exit 1
    fi

    docker exec --user git crosstown-forgejo forgejo admin user create \
        --username crosstown \
        --password "$ADMIN_PASSWORD" \
        --email admin@crosstown.local \
        --admin \
        --must-change-password=false

    log_success "Admin user 'crosstown' created"
else
    log_success "Admin user 'crosstown' already exists"
fi

# Step 2: Generate API token
log_info "Generating API token for NIP-34 integration..."

TOKEN=$(docker exec --user git crosstown-forgejo forgejo admin user generate-access-token \
    --username crosstown \
    --scopes write:repository,write:issue,write:misc \
    --token-name "Crosstown BLS NIP-34" 2>&1 | grep -oE '[a-f0-9]{40}' | head -1)

if [ -z "$TOKEN" ]; then
    log_error "Failed to generate token"
    log_info "You may need to generate it manually via the Forgejo UI:"
    log_info "  http://localhost:3004/user/settings/applications"
    exit 1
fi

log_success "API token generated"

# Step 3: Update .env file
log_info "Updating .env file..."

if [ -f ".env" ]; then
    # Check if FORGEJO_TOKEN already exists
    if grep -q "^FORGEJO_TOKEN=" .env; then
        # Update existing token
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^FORGEJO_TOKEN=.*/FORGEJO_TOKEN=$TOKEN/" .env
        else
            sed -i "s/^FORGEJO_TOKEN=.*/FORGEJO_TOKEN=$TOKEN/" .env
        fi
        log_success "Updated FORGEJO_TOKEN in .env"
    else
        # Add new token
        echo "" >> .env
        echo "# Forgejo API Token (for NIP-34 Git integration)" >> .env
        echo "FORGEJO_TOKEN=$TOKEN" >> .env
        log_success "Added FORGEJO_TOKEN to .env"
    fi
else
    log_error ".env file not found"
    log_info "Creating .env with token..."
    echo "FORGEJO_TOKEN=$TOKEN" > .env
    log_success "Created .env with token"
fi

# Step 4: Restart Crosstown to pick up new token
log_info "Restarting Crosstown node to pick up new token..."

if docker ps | grep -q crosstown-node; then
    docker restart crosstown-node
    log_success "Crosstown node restarted"
else
    log_warning "Crosstown node not running - start it to enable NIP-34 integration"
fi

# Success message
log_header "Setup Complete! 🎉"

cat << EOF

${BOLD}Forgejo Admin Access:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Web UI:       ${CYAN}http://localhost:3004${NC}
  Username:     ${BOLD}crosstown${NC}
  Password:     ${BOLD}(your admin password)${NC}


${BOLD}API Token Configuration:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Token:        ${CYAN}$TOKEN${NC}
  Scopes:       write:repository, write:issue, write:misc
  Location:     ${BOLD}.env${NC}


${BOLD}NIP-34 Integration Status:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  The Crosstown BLS can now apply NIP-34 events to Forgejo:

  ✅ Repository creation (kind 30617)
  ✅ Patch submission (kind 1617)
  ✅ Pull requests (kind 1618)
  ✅ Issue creation (kind 1621)


${BOLD}Test NIP-34 Integration:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Check Crosstown logs for NIP-34 status:
     ${CYAN}docker logs crosstown-node | grep NIP-34${NC}

  2. Create a test repository via Forgejo UI:
     ${CYAN}http://localhost:3004/repo/create${NC}

  3. Submit a patch via NIP-34 event (requires Nostr client + ILP)


${BOLD}Security Notes:${NC}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${YELLOW}⚠${NC} This token grants write access to all repositories
  ${YELLOW}⚠${NC} Keep .env file secure and never commit it to Git
  ${YELLOW}⚠${NC} Rotate token regularly via Forgejo admin panel

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

log_success "Forgejo is ready for NIP-34 integration!"
