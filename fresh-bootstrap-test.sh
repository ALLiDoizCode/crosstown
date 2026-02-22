#!/bin/bash
# Fresh bootstrap test with clean Anvil state

set -e

echo "🔄 Restarting Anvil..."
docker restart crosstown-anvil
sleep 5

echo "📝 Deploying contracts..."
cd /Users/jonathangreen/Documents/connector/packages/contracts
/Users/jonathangreen/.foundry/bin/forge script script/DeployLocal.s.sol:DeployLocalScript --rpc-url http://localhost:8545 --broadcast --silent

cd /Users/jonathangreen/Documents/crosstown

echo "🧹 Cleaning up old processes and logs..."
kill -9 $(lsof -t -i:3051 -i:3052 -i:8091 -i:8092 -i:7101 -i:7102 -i:3101 -i:3102 2>/dev/null) 2>/dev/null || true
rm -f /tmp/connector-peer*.log /tmp/crosstown-peer*.log

echo "🚀 Running bootstrap test..."
bash run-local-bootstrap-test.sh
