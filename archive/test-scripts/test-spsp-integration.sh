#!/bin/bash
#
# Run Crosstown SPSP Integration Test
#
# This script:
# 1. Starts Docker services (Anvil + Connector + Relay)
# 2. Runs the integration test
# 3. Cleans up Docker services
#
# Usage: ./test-spsp-integration.sh

set -e

COMPOSE_FILE="test/docker-compose-integration.yml"
TEST_PATTERN="crosstown-spsp-integration"

echo "🚀 Crosstown SPSP Integration Test"
echo "===================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if connector image exists
if ! docker image inspect connector:1.20.0 > /dev/null 2>&1; then
  echo "⚠️  Connector Docker image not found: connector:1.20.0"
  echo "    Please build the connector image first or update the image name in:"
  echo "    test/docker-compose-integration.yml"
  exit 1
fi

# Cleanup function
cleanup() {
  echo ""
  echo "🧹 Cleaning up Docker services..."
  docker-compose -f "$COMPOSE_FILE" down -v > /dev/null 2>&1 || true
  echo "✅ Cleanup complete"
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

# Stop any existing services
echo "🛑 Stopping any existing Docker services..."
docker-compose -f "$COMPOSE_FILE" down -v > /dev/null 2>&1 || true

# Start Docker services
echo "🐳 Starting Docker services (Anvil + Connector + Relay)..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service health
echo "🔍 Checking service health..."
for service in anvil connector relay; do
  if ! docker-compose -f "$COMPOSE_FILE" ps | grep "$service" | grep -q "Up"; then
    echo "❌ Service $service failed to start"
    docker-compose -f "$COMPOSE_FILE" logs "$service"
    exit 1
  fi
  echo "  ✓ $service is running"
done

echo ""
echo "✅ Docker services are ready"
echo ""

# Run the integration test
echo "🧪 Running integration test..."
echo ""

if pnpm test "$TEST_PATTERN"; then
  echo ""
  echo "✅ Integration test PASSED"
  echo ""
  exit 0
else
  echo ""
  echo "❌ Integration test FAILED"
  echo ""
  echo "Displaying service logs:"
  echo "----------------------"
  docker-compose -f "$COMPOSE_FILE" logs
  exit 1
fi
