/**
 * Builds a table for one game: the human in seat 0, the partner across,
 * and two named opponents, with a TableDriver to run it.
 */

import type { BotSpec, PersonaId, SkillLevel } from '../../bots/bot';
import { PARTNER_SPEC } from '../../bots/factory';
import { OPPONENT_IDS, personaById } from '../../bots/personas';
import type { GameEvent } from '../../engine/events';
import { newGame } from '../../engine/game';
import { STANDARD_RULES, type RuleSet } from '../../engine/rules';
import type { Seat } from '../../engine/seats';
import { shuffle } from '../../engine/deal';
import { InlineBotRunner } from '../../session/botRunner';
import { BotSeatController, HumanSeatController } from '../../session/controllers';
import { DEFAULT_PACING, NO_PACING, TableDriver } from '../../session/driver';
import { immediateScheduler, timerScheduler } from '../../session/scheduler';
import { cryptoRng, hashSeed, seededRng, type Rng } from '../../util/rng';
import type { SeatInfo } from '../layout';

export const HUMAN_SEAT: Seat = 0;

export interface TableOptions {
  /** Seed shuffles and opponent choice for a reproducible game; `null` uses crypto (RU-2). */
  readonly seed: number | null;
  /** `?e2e`: no pacing between bot actions. */
  readonly fast: boolean;
  readonly rules?: RuleSet;
  /** Opponent difficulty (OP-2); the partner always plays at full strength (PB-2). */
  readonly skill?: SkillLevel;
  /** Opponents for the left and right seats; picked at random when omitted (OP-4). */
  readonly opponents?: readonly [PersonaId, PersonaId];
}

export interface GameTable {
  readonly driver: TableDriver;
  readonly human: HumanSeatController;
  readonly humanSeat: Seat;
  readonly initialEvents: readonly GameEvent[];
  /** Who sits where, indexed by seat. */
  readonly seats: readonly [SeatInfo, SeatInfo, SeatInfo, SeatInfo];
}

export function createTable({
  seed,
  fast,
  rules = STANDARD_RULES,
  skill = 'standard',
  opponents,
}: TableOptions): GameTable {
  const shuffleRng: Rng = seed === null ? cryptoRng() : seededRng(seed);
  // A separate stream for opponent choice, so it never changes the deal.
  const pickRng: Rng = seed === null ? cryptoRng() : seededRng(hashSeed('opponents', seed));
  const [left, right] = opponents ?? (shuffle(OPPONENT_IDS, pickRng) as [PersonaId, PersonaId]);

  const firstDealer = shuffleRng.nextInt(4) as Seat;
  const { state, events } = newGame(rules, firstDealer, shuffleRng);
  const runner = new InlineBotRunner();
  const human = new HumanSeatController();
  const reportIllegal = (action: unknown) => console.error('Bot chose an illegal action', action);
  const opponent = (personaId: PersonaId): BotSpec => ({ role: 'opponent', personaId, skill });
  const seat = (spec: BotSpec) => new BotSeatController(spec, runner, reportIllegal);

  const driver = new TableDriver(
    {
      controllers: [human, seat(opponent(left)), seat(PARTNER_SPEC), seat(opponent(right))],
      scheduler: fast ? immediateScheduler : timerScheduler,
      shuffleRng,
      pacing: fast ? NO_PACING : DEFAULT_PACING,
    },
    state
  );
  const bot = (id: PersonaId): SeatInfo => ({
    name: personaById(id).name,
    persona: personaById(id),
  });
  return {
    driver,
    human,
    humanSeat: HUMAN_SEAT,
    initialEvents: events,
    seats: [{ name: 'You', persona: null }, bot(left), bot('partner'), bot(right)],
  };
}
