export interface LaunchOptions {
  readonly dev: boolean;
  readonly seed: number | null;
  /** `?e2e`: no pacing, so end-to-end tests run at full speed. */
  readonly fast: boolean;
  /** Animate the table: on unless `?e2e`, which `?motion` overrides for animation tests. */
  readonly motion: boolean;
}

/** Read `?dev`, `?seed=N`, `?e2e` and `?motion` from the page's query string. */
export function parseLaunchOptions(search: string): LaunchOptions {
  const params = new URLSearchParams(search);
  const raw = params.get('seed');
  const seed = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  const fast = params.has('e2e');
  return { dev: params.has('dev'), seed, fast, motion: !fast || params.has('motion') };
}
