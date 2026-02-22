/**
 * @crosstown/git-proxy
 *
 * ILP-Gated Git HTTP Proxy
 *
 * Intercepts Git HTTP operations (push/pull/clone) and requires ILP payment
 * before proxying to the upstream Git server (Forgejo).
 */

export { GitProxyServer } from './server.js';
export type { GitProxyConfig, GitOperation } from './types.js';
export { GitPaymentCalculator } from './pricing.js';
