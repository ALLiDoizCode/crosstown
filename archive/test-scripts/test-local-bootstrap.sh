#!/bin/bash
# Test Local Bootstrap Flow
#
# This script tests the bootstrap flow with local Node processes.
# Run in 4 separate terminals or use tmux/screen.

set -e

echo "🧪 Bootstrap Flow Test - Local Node Processes"
echo "================================================"
echo ""
echo "Prerequisites:"
echo "  ✓ Anvil running on localhost:8545"
echo "  ✓ Token Faucet running on localhost:3500"
echo ""
echo "You'll need 4 terminals:"
echo ""
echo "Terminal 1 - Connector Peer1 (Genesis):"
echo "  cd /Users/jonathangreen/Documents/crosstown"
echo "  ./dev-connector-peer1.sh"
echo ""
echo "Terminal 2 - Crosstown Peer1 (Genesis):"
echo "  cd /Users/jonathangreen/Documents/crosstown"
echo "  ./dev-peer1.sh"
echo ""
echo "Terminal 3 - Connector Peer2 (Joiner):"
echo "  cd /Users/jonathangreen/Documents/crosstown"
echo "  ./dev-connector-peer2.sh"
echo ""
echo "Terminal 4 - Crosstown Peer2 (Joiner):"
echo "  cd /Users/jonathangreen/Documents/crosstown"
echo "  ./dev-peer2.sh"
echo ""
echo "================================================"
echo ""
echo "Verification Commands:"
echo ""
echo "# Check Peer1 Genesis published kind:10032"
echo "curl -s http://localhost:3101/health | jq ."
echo ""
echo "# Check Peer2 discovered Peer1"
echo "curl -s http://localhost:8092/admin/peers | jq ."
echo ""
echo "# Check BTP connection established"
echo 'curl -s http://localhost:8092/admin/peers | jq ".peers[] | select(.connected == true)"'
echo ""
echo "# Send test SPSP packet via ILP"
echo 'curl -s http://localhost:8092/admin/ilp/send -X POST -H "Content-Type: application/json" -d '"'"'{"destination":"g.crosstown.peer1","amount":"0","data":"dGVzdA=="}'"'"' | jq .'
echo ""
