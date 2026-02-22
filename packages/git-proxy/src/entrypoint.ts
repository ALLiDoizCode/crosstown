/**
 * Standalone Git Proxy Entrypoint
 *
 * Environment variables:
 * - GIT_PROXY_PORT: Port to listen on (default: 3002)
 * - FORGEJO_URL: Upstream Forgejo URL (required)
 * - BLS_URL: BLS endpoint for payment validation (required)
 * - READ_PRICE: Base price for read operations (default: 100)
 * - WRITE_PRICE: Base price for write operations (default: 1000)
 * - PRICE_PER_KB: Price per kilobyte (default: 10)
 * - NODE_ID: Optional node identifier
 * - VERBOSE: Enable verbose logging (default: false)
 */

import { GitProxyServer } from './server.js';
import type { GitProxyConfig } from './types.js';

function loadConfig(): GitProxyConfig {
  const port = parseInt(process.env['GIT_PROXY_PORT'] || '3002', 10);
  const upstreamUrl = process.env['FORGEJO_URL'];
  const blsUrl = process.env['BLS_URL'];

  if (!upstreamUrl) {
    throw new Error('FORGEJO_URL environment variable is required');
  }
  if (!blsUrl) {
    throw new Error('BLS_URL environment variable is required');
  }

  const readPrice = BigInt(process.env['READ_PRICE'] || '100');
  const writePrice = BigInt(process.env['WRITE_PRICE'] || '1000');
  const pricePerKb = BigInt(process.env['PRICE_PER_KB'] || '10');
  const rejectNonGit = process.env['REJECT_NON_GIT'] !== 'false'; // Default: true

  return {
    port,
    upstreamUrl,
    blsUrl,
    pricing: {
      readPrice,
      writePrice,
      pricePerKb,
      freeOperations: ['info-refs'], // Git discovery is free
    },
    rejectNonGit,
    nodeId: process.env['NODE_ID'],
    verbose: process.env['VERBOSE'] === 'true',
  };
}

async function main(): Promise<void> {
  console.log('🚀 Starting ILP-Gated Git Proxy...\n');

  const config = loadConfig();

  console.log('Configuration:');
  console.log(`  Port:           ${config.port}`);
  console.log(`  Forgejo:        ${config.upstreamUrl}`);
  console.log(`  BLS:            ${config.blsUrl}`);
  console.log(`  Read Price:     ${config.pricing.readPrice}`);
  console.log(`  Write Price:    ${config.pricing.writePrice}`);
  console.log(`  Price/KB:       ${config.pricing.pricePerKb}`);
  console.log(`  Reject Non-Git: ${config.rejectNonGit !== false}`);
  console.log(`  Verbose:        ${config.verbose || false}`);
  console.log('');

  const server = new GitProxyServer(config);
  server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
