/**
 * ILP-Gated Git HTTP Proxy Server
 *
 * Architecture:
 * 1. Client sends Git request → Proxy
 * 2. Proxy calculates price → requires ILP payment via custom header
 * 3. Client pays via BLS → includes payment proof in header
 * 4. Proxy validates payment with BLS
 * 5. Proxy forwards request to Forgejo
 * 6. Proxy streams response back to client
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { request } from 'undici';
import type { GitProxyConfig, PaymentResult, GitOperationMetadata } from './types.js';
import { GitPaymentCalculator } from './pricing.js';

export class GitProxyServer {
  private app: Hono;
  private calculator: GitPaymentCalculator;
  private config: GitProxyConfig;

  constructor(config: GitProxyConfig) {
    this.config = config;
    this.calculator = new GitPaymentCalculator(config);
    this.app = new Hono();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (c) => {
      return c.json({
        status: 'healthy',
        service: 'git-proxy',
        nodeId: this.config.nodeId,
        upstreamUrl: this.config.upstreamUrl,
      });
    });

    // Proxy all Git HTTP requests
    this.app.all('*', async (c) => {
      const path = c.req.path;
      const method = c.req.method;

      // Security: Reject non-Git paths if configured
      const isGitPath = this.isGitHttpPath(path);
      if (this.config.rejectNonGit && !isGitPath) {
        this.log(`Rejected non-Git path: ${path}`);
        return c.json(
          {
            error: 'Not a Git operation',
            message: 'This endpoint only accepts Git HTTP operations. Access the web UI at port 3004.',
            path,
          },
          403
        );
      }

      // Parse operation
      const operation = this.calculator.parseOperation(path, method);
      const repository = this.calculator.parseRepository(path);
      const contentLength = c.req.header('content-length')
        ? parseInt(c.req.header('content-length') || '0', 10)
        : undefined;

      const metadata: GitOperationMetadata = {
        operation,
        repository,
        contentLength,
        estimatedPrice: 0n,
      };

      // Calculate price
      metadata.estimatedPrice = this.calculator.calculatePrice(metadata);

      this.log(`Git ${operation} on ${repository} - price: ${metadata.estimatedPrice}`);

      // If free operation, proxy immediately
      if (metadata.estimatedPrice === 0n) {
        return await this.proxyRequest(c, path, method);
      }

      // Check for payment proof
      const paymentProof = c.req.header('X-ILP-Payment-Proof');
      if (!paymentProof) {
        return c.json(
          {
            error: 'Payment required',
            operation,
            repository,
            price: metadata.estimatedPrice.toString(),
            message: 'Include X-ILP-Payment-Proof header with payment receipt',
          },
          402
        );
      }

      // Validate payment
      const paymentResult = await this.validatePayment(paymentProof, metadata.estimatedPrice);
      if (!paymentResult.valid) {
        return c.json(
          {
            error: 'Invalid payment',
            message: paymentResult.error || 'Payment validation failed',
          },
          402
        );
      }

      // Payment valid - proxy the request
      this.log(`✅ Payment validated for ${operation} on ${repository}`);
      return await this.proxyRequest(c, path, method);
    });
  }

  /**
   * Validate payment with BLS
   */
  private async validatePayment(proof: string, expectedAmount: bigint): Promise<PaymentResult> {
    try {
      // Call BLS to validate payment proof
      const response = await request(`${this.config.blsUrl}/validate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof,
          expectedAmount: expectedAmount.toString(),
        }),
      });

      if (response.statusCode !== 200) {
        return {
          valid: false,
          error: `BLS returned ${response.statusCode}`,
        };
      }

      const result = await response.body.json() as any;
      return {
        valid: result.valid === true,
        amount: result.amount ? BigInt(result.amount) : undefined,
        error: result.error,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Payment validation failed',
      };
    }
  }

  /**
   * Proxy request to upstream Forgejo server
   */
  private async proxyRequest(c: any, path: string, method: string): Promise<Response> {
    try {
      const upstreamUrl = `${this.config.upstreamUrl}${path}`;

      // Get request body if present
      const body = method !== 'GET' && method !== 'HEAD'
        ? await c.req.arrayBuffer()
        : undefined;

      // Forward headers (excluding hop-by-hop headers)
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((value: string, key: string) => {
        const lowerKey = key.toLowerCase();
        if (!['host', 'connection', 'keep-alive', 'transfer-encoding', 'x-ilp-payment-proof'].includes(lowerKey)) {
          headers[key] = value;
        }
      });

      this.log(`Proxying ${method} ${path} → ${upstreamUrl}`);

      // Make upstream request
      const response = await request(upstreamUrl, {
        method: method as any,
        headers,
        body: body ? Buffer.from(body) : undefined,
      });

      // Stream response back
      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          responseHeaders[key] = value;
        }
      }

      // Return streaming response
      return new Response(response.body as any, {
        status: response.statusCode,
        headers: responseHeaders,
      });
    } catch (error) {
      this.log(`Proxy error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return c.json(
        {
          error: 'Proxy error',
          message: error instanceof Error ? error.message : 'Failed to proxy request',
        },
        502
      );
    }
  }

  /**
   * Check if path is a Git HTTP operation
   */
  private isGitHttpPath(path: string): boolean {
    return (
      path.includes('/info/refs') ||
      path.includes('/git-upload-pack') ||
      path.includes('/git-receive-pack') ||
      path.endsWith('.git') ||
      path.endsWith('.git/')
    );
  }

  private log(message: string): void {
    if (this.config.verbose) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [GitProxy] ${message}`);
    }
  }

  /**
   * Start the proxy server
   */
  start(): void {
    serve(
      {
        fetch: this.app.fetch,
        port: this.config.port,
      },
      (info) => {
        console.log(`🔒 ILP-Gated Git Proxy listening on port ${info.port}`);
        console.log(`   Upstream: ${this.config.upstreamUrl}`);
        console.log(`   BLS: ${this.config.blsUrl}`);
        console.log(`   Read price: ${this.config.pricing.readPrice}`);
        console.log(`   Write price: ${this.config.pricing.writePrice}`);
        console.log(`   Price per KB: ${this.config.pricing.pricePerKb}`);
      }
    );
  }
}
