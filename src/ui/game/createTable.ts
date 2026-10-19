/**
 * Builds a table for one game from a `SavedGame`, new or resumed, with a
 * TableDriver to run it and a PersistenceSink to save it (PE-1).
 */

import { personaById } from '../../bots/personas';
import type { GameEvent } from '../../engine/events';
import { STANDARD_RULES } from '../../engine/rules';
import { SEATS, type Seat } from '../../engine/seats';
import { InlineBotRunner } from '../../session/botRunner';
import {
  BotSeatController,
  HumanSeatController,
  type SeatController,
} from '../../session/controllers';
import { NO_PACING, TableDriver, type EventSink } from '../../session/driver';
import { immediateScheduler, timerScheduler } from '../../session/scheduler';
import type { StorageLike } from '../../state/persistence';
import {
  botAt,
  PersistenceSink,
  resumeShuffleRng,
  startGame,
  type GameSetup,
  type SavedGame,
} from '../../state/savedGame';
import { pacingFor, type Settings } from '../../state/settings';
import type { Rng } from '../../util/rng';
import type { SeatInfo } from '../layout';

export interface TableOptions {
  /** `?e2e`: no pacing between bot actions. */
  readonly fast: boolean;
  /** The pause before each bot action (GF-4). */
  readonly pacingMs: number;
  /** Where to save the game after every action; `null` to not save. */
  readonly storage: StorageLike | null;
}

export interface GameTable {
  readonly driver: TableDriver;
  readonly human: HumanSeatController;
  readonly humanSeat: Seat;
  /** Events to present when the table first starts (the first deal of a new game). */
  readonly initialEvents: readonly GameEvent[];
  /** Who sits where, indexed by seat. */
  readonly seats: readonly [SeatInfo, SeatInfo, SeatInfo, SeatInfo];
  /** With the driver's current state, everything needed to resume the game. */
  readonly setup: GameSetup;
}

/** A new game with the current settings (GF-1). `seed` makes it reproducible. */
export function newTable(
  settings: Settings,
  seed: number | null,
  options: TableOptions
): GameTable {
  const { saved, events, shuffleRng } = startGame({
    rules: STANDARD_RULES,
    skill: settings.skill,
    opponents: settings.opponents,
    seed,
  });
  return buildTable(saved, shuffleRng, events, options);
}

/** Pick a saved game up exactly where it was left (PE-1). */
export function resumeTable(saved: SavedGame, options: TableOptions): GameTable {
  return buildTable(saved, resumeShuffleRng(saved), [], options);
}

function buildTable(
  saved: SavedGame,
  shuffleRng: Rng,
  initialEvents: readonly GameEvent[],
  { fast, pacingMs, storage }: TableOptions
): GameTable {
  const { seats } = saved;
  const runner = new InlineBotRunner();
  const human = new HumanSeatController();
  const reportIllegal = (action: unknown) => console.error('Bot chose an illegal action', action);
  const controllerAt = (seat: Seat): SeatController => {
    const spec = botAt(seats, seat);
    return spec === null ? human : new BotSeatController(spec, runner, reportIllegal);
  };
  const infoAt = (seat: Seat): SeatInfo => {
    const spec = botAt(seats, seat);
    if (spec === null) return { name: 'You', persona: null };
    const persona = personaById(spec.personaId);
    return { name: persona.name, persona };
  };
  const setup: GameSetup = { seats, seed: saved.seed };
  const sinks: EventSink[] = storage === null ? [] : [new PersistenceSink(storage, setup)];

  const driver = new TableDriver(
    {
      controllers: [controllerAt(0), controllerAt(1), controllerAt(2), controllerAt(3)],
      scheduler: fast ? immediateScheduler : timerScheduler,
      shuffleRng,
      sinks,
      pacing: fast ? NO_PACING : pacingFor(pacingMs),
    },
    saved.game
  );
  return {
    driver,
    human,
    humanSeat: seats.humanSeat,
    initialEvents,
    seats: SEATS.map(infoAt) as unknown as GameTable['seats'],
    setup,
  };
}
