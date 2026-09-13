// Observed with the pinned runtime in Playwright WebKit on macOS ARM64.
// These are known failures, not a guarantee that every unlisted file will run.
// Recheck this list when changing source or upgrading runtime/release.json.
export const safariLimitedExamples = new Set([
  'lists', 'structures', 'proof-calculations',
  'euler-modular', 'four-squares', 'pythagorean-triples', 'am-gm',
  'cayley-hamilton', 'subsets', 'bridges', 'combinations', 'bezout', 'cantor',
  'geometric-series', 'arithmetic-series', 'euclidean-gcd', 'induction-principle',
  'sum-squares', 'cauchy-schwarz', 'factor-remainder', 'cramer', 'quadratic',
  'rings', 'gf5', 'gf4', 'diffie-hellman', 'rsa', 'hashing', 'sha256',
  'tail-recursion', 'notation', 'proof-efficiency-slow',
]);

// Exercises are tested independently of their related example.
export const safariLimitedLessons = new Set([
  'notation', 'hashing-basics', 'sha256-message',
]);

export function usesWebKit(userAgent: string): boolean {
  // Desktop Chromium also advertises AppleWebKit and Safari. Chrome/Firefox
  // on iOS normally use WebKit and advertise CriOS/FxiOS instead.
  return /AppleWebKit\//i.test(userAgent)
    && !/(?:Chrome|Chromium|Edg|OPR|Android)\//i.test(userAgent)
    && !/Android/i.test(userAgent);
}

export function isStackLimitError(message: string): boolean {
  return /maximum call stack size exceeded|stack overflow|too much recursion/i.test(message);
}
