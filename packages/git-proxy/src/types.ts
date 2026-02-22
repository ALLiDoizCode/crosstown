/**
 * Git operation types
 */
export type GitOperation =
  | 'clone'         // git clone (read-only)
  | 'fetch'         // git fetch/pull (read-only)
  | 'push'          // git push (write)
  | 'info-refs';    // discovery (usually free)

/**
 * Git proxy configuration
 */
export interface GitProxyConfig {
  /** Port to listen on */
  port: number;

  /** Upstream Forgejo URL */
  upstreamUrl: string;

  /** BLS endpoint for payment validation */
  blsUrl: string;

  /** Pricing configuration */
  pricing: {
    /** Base price for read operations (clone/fetch) */
    readPrice: bigint;

    /** Base price for write operations (push) */
    writePrice: bigint;

    /** Price per kilobyte of data */
    pricePerKb: bigint;

    /** Free operations (e.g., info-refs discovery) */
    freeOperations: GitOperation[];
  };

  /** Optional: Reject non-Git HTTP paths (security) */
  rejectNonGit?: boolean;

  /** Optional: Node ID for logging */
  nodeId?: string;

  /** Optional: Enable verbose logging */
  verbose?: boolean;
}

/**
 * Payment validation result
 */
export interface PaymentResult {
  valid: boolean;
  amount?: bigint;
  error?: string;
}

/**
 * Git operation metadata
 */
export interface GitOperationMetadata {
  operation: GitOperation;
  repository: string;
  contentLength?: number;
  estimatedPrice: bigint;
}
