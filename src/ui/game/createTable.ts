/**
 * Builds a table for one game: the human in seat 0, placeholder bots in
 * the other seats, and a TableDriver to run it.
 */

import type { BotSpec } from '../../bots/bot';
import type { GameEvent } from '../../engine/events';
import { newGame } from '../../engine/game';
import { STANDARD_RULES, type RuleSet } from '../../engine/rules';
import type { Seat } from '../../engine/seats';
import { InlineBotRunner } from '../../session/botRunner';
import { BotSeatController, HumanSeatController } from '../../session/controllers';
import { DEFAULT_PACING, NO_PACING, TableDriver } from '../../session/driver';
import { immediateScheduler, timerScheduler } from '../../session/scheduler';
import { cryptoRng, seededRng, type Rng } from '../../util/rng';

export const HUMAN_SEAT: Seat = 0;

const PARTNER: BotSpec = { role: 'partner', personaId: 'placeholder', skill: 'standard' };
const OPPONENT: BotSpec = { role: 'opponent', personaId: 'placeholder', skill: 'standard' };

export interface TableOptions {
  /** Seed shuffles for a reproducible game; `null` uses crypto (RU-2). */
  readonly seed: number | null;
  /** `?e2e`: no pacing between bot actions. */
  readonly fast: boolean;
  readonly rules?: RuleSet;
}

export interface GameTable {
  readonly driver: TableDriver;
  readonly human: HumanSeatController;
  readonly humanSeat: Seat;
  readonly initialEvents: readonly GameEvent[];
}

export function createTable({ seed, fast, rules = STANDARD_RULES }: TableOptions): GameTable {
  const shuffle: Rng = seed === null ? cryptoRng() : seededRng(seed);
  const firstDealer = shuffle.nextInt(4) as Seat;
  const { state, events } = newGame(rules, firstDealer, shuffle);
  const runner = new InlineBotRunner();
  const human = new HumanSeatController();
  const reportIllegal = (action: unknown) => console.error('Bot chose an illegal action', action);
  const driver = new TableDriver(
    {
      controllers: [
        human,
        new BotSeatController(OPPONENT, runner, reportIllegal),
        new BotSeatController(PARTNER, runner, reportIllegal),
        new BotSeatController(OPPONENT, runner, reportIllegal),
      ],
      scheduler: fast ? immediateScheduler : timerScheduler,
      shuffleRng: shuffle,
      pacing: fast ? NO_PACING : DEFAULT_PACING,
    },
    state
  );
  return { driver, human, humanSeat: HUMAN_SEAT, initialEvents: events };
}
