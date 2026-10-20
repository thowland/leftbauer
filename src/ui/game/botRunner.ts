import { WorkerBotRunner, type WorkerLike } from '../../session/workerRunner';

/**
 * Bots for the app: decided in a Web Worker (Technical Spec §9.4), or
 * inline where workers are unavailable.
 */
export function browserBotRunner(): WorkerBotRunner {
  return new WorkerBotRunner(
    () =>
      new Worker(new URL('../../workers/bot.worker.ts', import.meta.url), {
        type: 'module',
      }) as unknown as WorkerLike
  );
}
