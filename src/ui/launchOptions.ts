// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

export interface LaunchOptions {
  readonly dev: boolean;
  readonly seed: number | null;
  /** `?e2e`: no pacing, so end-to-end tests run at full speed. */
  readonly fast: boolean;
  /** Animate the table: on unless `?e2e`, which `?motion` overrides for animation tests. */
  readonly motion: boolean;
  /** Play sounds: on unless `?e2e`, so tests stay silent; `?sound` turns them back on. */
  readonly sound: boolean;
}

/** Read `?dev`, `?seed=N`, `?e2e`, `?motion` and `?sound` from the page's query string. */
export function parseLaunchOptions(search: string): LaunchOptions {
  const params = new URLSearchParams(search);
  const raw = params.get('seed');
  const seed = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  const fast = params.has('e2e');
  return {
    dev: params.has('dev'),
    seed,
    fast,
    motion: !fast || params.has('motion'),
    sound: !fast || params.has('sound'),
  };
}
