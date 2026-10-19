/** Raised by any session wait that is cancelled through its AbortSignal. */
export class AbortedError extends Error {
  constructor() {
    super('Aborted');
    this.name = 'AbortedError';
  }
}

export function isAborted(error: unknown): error is AbortedError {
  return error instanceof AbortedError;
}

/**
 * Wait for `start` to settle, rejecting with {@link AbortedError} as soon as
 * `signal` aborts. `start` receives a cleanup registrar for its own
 * resources (timers, pending requests).
 */
export function abortable<T>(
  signal: AbortSignal,
  start: (resolve: (value: T) => void, reject: (e: unknown) => void) => () => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new AbortedError());
      return;
    }
    const onAbort = () => {
      cleanup();
      reject(new AbortedError());
    };
    const done = () => signal.removeEventListener('abort', onAbort);
    const cleanup = start(
      (value) => {
        done();
        resolve(value);
      },
      (error) => {
        done();
        reject(error);
      }
    );
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
