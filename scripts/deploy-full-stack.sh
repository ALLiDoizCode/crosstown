#!/bin/bash
# Crosstown Full Stack Deployment Script
#
# This script automates the deployment of Crosstown with Agent-Runtime
# in External Mode (HTTP between services).
#
# Usage:
#   ./scripts/deploy-full-stack.sh [build|start|stop|restart|logs|clean]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose-full-stack.yml"
AGENT_RUNTIME_DIR="../agent-runtime"

# Helper functions
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

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    log_success "Docker found: $(docker --version | cut -d' ' -f3)"

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    log_success "Docker Compose found: $(docker compose version | cut -d' ' -f4)"

    # Check agent-runtime directory
    if [ ! -d "$AGENT_RUNTIME_DIR" ]; then
        log_error "Agent-Runtime not found at $AGENT_RUNTIME_DIR"
        log_info "Please clone agent-runtime repository:"
        log_info "  cd .. && git clone <agent-runtime-repo-url> agent-runtime"
        exit 1
    fi
    log_success "Agent-Runtime directory found"

    # Check .env file
    if [ ! -f ".env" ]; then
        log_warning ".env file not found"
        log_info "Copying .env.example to .env..."
        cp .env.example .env

        # Generate Nostr secret key
        NOSTR_KEY=$(openssl rand -hex 32)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/NOSTR_SECRET_KEY=/NOSTR_SECRET_KEY=$NOSTR_KEY/" .env
        else
            sed -i "s/NOSTR_SECRET_KEY=/NOSTR_SECRET_KEY=$NOSTR_KEY/" .env
        fi

        log_success "Created .env with generated Nostr key"
        log_warning "Please review and update .env before deploying"
    else
        log_success ".env file found"
    fi
}

build_images() {
    log_info "Building Docker images..."

    # Build Crosstown
    log_info "Building Crosstown optimized image..."
    docker build -f docker/Dockerfile -t crosstown:optimized . || {
        log_error "Crosstown build failed"
        exit 1
    }
    log_success "Crosstown image built"

    # Build Agent-Runtime
    log_info "Building Agent-Runtime image..."
    (cd "$AGENT_RUNTIME_DIR" && docker build -t agent-runtime:latest .) || {
        log_error "Agent-Runtime build failed"
        exit 1
    }
    log_success "Agent-Runtime image built"

    log_success "All images built successfully"
}

start_stack() {
    log_info "Starting Crosstown full stack..."

    docker compose -f "$COMPOSE_FILE" up -d || {
        log_error "Failed to start stack"
        exit 1
    }

    log_info "Waiting for services to become healthy..."
    sleep 5

    # Check health
    check_health
}

stop_stack() {
    log_info "Stopping Crosstown full stack..."
    docker compose -f "$COMPOSE_FILE" down
    log_success "Stack stopped"
}

restart_stack() {
    log_info "Restarting Crosstown full stack..."
    stop_stack
    start_stack
}

show_logs() {
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
}

check_health() {
    log_info "Checking service health..."

    # Check container status
    CONTAINERS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null)

    if [ -z "$CONTAINERS" ]; then
        log_warning "No containers running"
        return 1
    fi

    # TigerBeetle
    if docker compose -f "$COMPOSE_FILE" ps tigerbeetle | grep -q "Up"; then
        log_success "TigerBeetle: Running"
    else
        log_error "TigerBeetle: Not running"
    fi

    # Agent-Runtime
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        log_success "Agent-Runtime: Healthy (http://localhost:8080)"
    else
        log_warning "Agent-Runtime: Not healthy yet"
    fi

    # Crosstown
    if curl -sf http://localhost:3100/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:3100/health | jq -r '.status // "unknown"')
        log_success "Crosstown BLS: $HEALTH (http://localhost:3100)"

        # Show bootstrap status
        PHASE=$(curl -s http://localhost:3100/health | jq -r '.bootstrapPhase // "unknown"')
        PEERS=$(curl -s http://localhost:3100/health | jq -r '.peerCount // 0')
        log_info "  Bootstrap: $PHASE | Peers: $PEERS"
    else
        log_warning "Crosstown BLS: Not healthy yet"
    fi

    echo ""
    log_info "Service URLs:"
    echo "  • Crosstown BLS:    http://localhost:3100/health"
    echo "  • Nostr Relay:      ws://localhost:7100"
    echo "  • Agent-Runtime:    http://localhost:8080/health"
    echo "  • Explorer UI:      http://localhost:3001"
    echo "  • Admin API:        http://localhost:8081"
}

clean_stack() {
    log_warning "This will remove all containers, networks, and volumes"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up..."
        docker compose -f "$COMPOSE_FILE" down -v
        log_success "Stack cleaned"
    else
        log_info "Cancelled"
    fi
}

show_usage() {
    cat << EOF
${GREEN}Crosstown Full Stack Deployment${NC}

Usage: $0 [COMMAND]

Commands:
    build       Build all Docker images (Crosstown + Agent-Runtime)
    start       Start the full stack (TigerBeetle + Agent-Runtime + Crosstown)
    stop        Stop all services
    restart     Restart all services
    logs        Show and follow logs from all services
    health      Check health status of all services
    clean       Remove all containers, networks, and volumes
    help        Show this help message

Examples:
    $0 build              # Build images first time
    $0 start              # Deploy the stack
    $0 health             # Check if everything is running
    $0 logs               # Monitor logs
    $0 stop               # Stop when done

For more details, see DEPLOYMENT.md
EOF
}

# Main script
case "${1:-help}" in
    build)
        check_prerequisites
        build_images
        ;;
    start)
        check_prerequisites
        start_stack
        ;;
    stop)
        stop_stack
        ;;
    restart)
        restart_stack
        ;;
    logs)
        show_logs
        ;;
    health)
        check_health
        ;;
    clean)
        clean_stack
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
