export interface LaunchOptions {
  readonly dev: boolean;
  readonly seed: number | null;
}

/** Read `?dev` and `?seed=N` from the page's query string. */
export function parseLaunchOptions(search: string): LaunchOptions {
  const params = new URLSearchParams(search);
  const raw = params.get('seed');
  const seed = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  return { dev: params.has('dev'), seed };
}
