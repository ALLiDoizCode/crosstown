/**
 * Git Payment Calculator
 *
 * Calculates payment amounts for Git operations based on:
 * - Operation type (read vs write)
 * - Content size
 * - Pricing configuration
 */

import type { GitProxyConfig, GitOperation, GitOperationMetadata } from './types.js';

export class GitPaymentCalculator {
  constructor(private config: GitProxyConfig) {}

  /**
   * Calculate price for a Git operation
   */
  calculatePrice(metadata: GitOperationMetadata): bigint {
    const { operation, contentLength } = metadata;
    const { pricing } = this.config;

    // Free operations
    if (pricing.freeOperations.includes(operation)) {
      return 0n;
    }

    // Base price
    let price: bigint;
    if (operation === 'push') {
      price = pricing.writePrice;
    } else {
      price = pricing.readPrice;
    }

    // Add per-KB charge if content length is known
    if (contentLength && contentLength > 0) {
      const kb = Math.ceil(contentLength / 1024);
      price += pricing.pricePerKb * BigInt(kb);
    }

    return price;
  }

  /**
   * Parse Git operation from HTTP request
   */
  parseOperation(path: string, method: string): GitOperation {
    // Git HTTP protocol uses specific paths
    if (path.includes('/info/refs')) {
      return 'info-refs';
    }
    if (path.includes('/git-upload-pack')) {
      return method === 'POST' ? 'fetch' : 'clone';
    }
    if (path.includes('/git-receive-pack')) {
      return 'push';
    }

    // Default to info-refs for unknown paths
    return 'info-refs';
  }

  /**
   * Extract repository name from path
   */
  parseRepository(path: string): string {
    // Remove /git/ prefix and /info/refs or /git-*-pack suffix
    const match = path.match(/\/([^/]+?)(?:\.git)?(?:\/info\/refs|\/git-\w+-pack)?$/);
    return match?.[1] || 'unknown';
  }
}
