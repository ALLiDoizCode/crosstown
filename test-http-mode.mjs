#!/usr/bin/env node
/**
 * Manual HTTP Mode Test
 * Tests ILP packet sending without nostr-tools dependency
 */

import { randomBytes } from 'crypto';

const CONNECTOR_URL = 'http://localhost:8080';
const BLS_URL = 'http://localhost:3100';

async function testILPPacketSend() {
  console.log('🧪 Testing ILP Packet Send via HTTP Connector\n');

  // Create a simple PREPARE packet (ILP packet format)
  const condition = randomBytes(32);

  const packet = {
    destination: 'g.crosstown.my-node',
    amount: '100',
    expiresAt: new Date(Date.now() + 30000).toISOString(),
    executionCondition: condition.toString('base64'),
    data: Buffer.from('test event data').toString('base64'),
  };

  try {
    console.log('📤 Sending ILP PREPARE packet to connector...');
    const response = await fetch('http://localhost:8081/admin/ilp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(packet),
    });

    console.log(`📊 Response status: ${response.status}`);
    const result = await response.text();
    console.log(`📨 Response: ${result}\n`);

    if (response.ok) {
      console.log('✅ ILP packet sent successfully');
      return true;
    } else {
      console.log('⚠️  ILP packet failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testAdminAPI() {
  console.log('🔍 Testing Admin API\n');

  try {
    // Check peers
    const peersRes = await fetch('http://localhost:8081/admin/peers');
    const peers = await peersRes.json();
    console.log('📡 Peers:', JSON.stringify(peers, null, 2));

    // Check routes
    const routesRes = await fetch('http://localhost:8081/admin/routes');
    const routes = await routesRes.json();
    console.log('\n🗺️  Routes:', JSON.stringify(routes, null, 2));

    // Check balances
    const balancesRes = await fetch('http://localhost:8081/admin/settlement/states');
    const balances = await balancesRes.json();
    console.log('\n💰 Settlement states:', JSON.stringify(balances, null, 2));

    return true;
  } catch (error) {
    console.error('❌ Admin API error:', error.message);
    return false;
  }
}

async function testBLS() {
  console.log('\n🏥 Testing BLS Health\n');

  try {
    const response = await fetch(`${BLS_URL}/health`);
    const health = await response.json();
    console.log('📊 BLS Health:', JSON.stringify(health, null, 2));
    return true;
  } catch (error) {
    console.error('❌ BLS error:', error.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Crosstown HTTP Mode Integration Test                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const blsOk = await testBLS();
  const adminOk = await testAdminAPI();
  const packetOk = await testILPPacketSend();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Test Results                                         ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║   BLS Health:       ${blsOk ? '✅ PASS' : '❌ FAIL'}                          ║`);
  console.log(`║   Admin API:        ${adminOk ? '✅ PASS' : '❌ FAIL'}                          ║`);
  console.log(`║   ILP Packet Send:  ${packetOk ? '✅ PASS' : '❌ FAIL'}                          ║`);
  console.log('╚════════════════════════════════════════════════════════╝');

  process.exit(blsOk && adminOk ? 0 : 1);
}

main();
