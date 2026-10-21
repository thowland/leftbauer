// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Pacing between bot actions — GF-4; Technical Spec §8.2.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { abortable } from './abort';

export interface Scheduler {
  delay(ms: number, signal: AbortSignal): Promise<void>;
}

/** Real time, via setTimeout. */
export const timerScheduler: Scheduler = {
  delay(ms, signal) {
    return abortable<void>(signal, (resolve) => {
      const id = setTimeout(resolve, ms);
      return () => clearTimeout(id);
    });
  },
};

/** No waiting at all: tests, the tournament harness and `?e2e`. */
export const immediateScheduler: Scheduler = {
  delay(_ms, signal) {
    return abortable<void>(signal, (resolve) => {
      resolve();
      return () => {};
    });
  },
};
