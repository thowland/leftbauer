export interface LaunchOptions {
  readonly dev: boolean;
  readonly seed: number | null;
  /** `?e2e`: no pacing, so end-to-end tests run at full speed. */
  readonly fast: boolean;
}

/** Read `?dev`, `?seed=N` and `?e2e` from the page's query string. */
export function parseLaunchOptions(search: string): LaunchOptions {
  const params = new URLSearchParams(search);
  const raw = params.get('seed');
  const seed = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  return { dev: params.has('dev'), seed, fast: params.has('e2e') };
}
