/**
 * The saved game — PE-1; Technical Spec §10.1.
 *
 * Written after every applied action by `PersistenceSink`. Bot decisions
 * are deterministic given the view (PB-3), so a resumed hand plays on
 * exactly as it would have without the interruption.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { BotSpec, PersonaId, SkillLevel } from '../bots/bot';
import { PARTNER_SPEC } from '../bots/factory';
import { PERSONAS } from '../bots/personas';
import { isCardId } from '../engine/cards';
import type { GameEvent } from '../engine/events';
import { currentActor, legalActions, newGame } from '../engine/game';
import { assertSupportedRules, type RuleSet } from '../engine/rules';
import { leftOf, partnerOf, SEATS, type Seat } from '../engine/seats';
import type { GameState, HandPhase } from '../engine/state';
import { toPlayerView } from '../engine/view';
import type { EventSink } from '../session/driver';
import { cryptoRng, hashSeed, seededRng, type Rng } from '../util/rng';
import { clear, isRecord, save, type StorageLike, type VersionedStore } from './persistence';
import { resolveOpponents, type OpponentSettings } from './settings';

export interface SeatSetup {
  readonly humanSeat: Seat;
  /** Seats without an entry are human. */
  readonly bots: Partial<Record<Seat, BotSpec>>;
}

export interface SavedGame {
  readonly game: GameState;
  readonly seats: SeatSetup;
  /** The `?seed=N` the game was started with, or `null` for crypto shuffles. */
  readonly seed: number | null;
}

/** Everything saved about a game except the game itself. */
export type GameSetup = Omit<SavedGame, 'game'>;

export interface NewGameOptions {
  readonly rules: RuleSet;
  readonly skill: SkillLevel;
  readonly opponents: OpponentSettings;
  readonly seed: number | null;
  readonly humanSeat?: Seat;
}

export interface StartedGame {
  readonly saved: SavedGame;
  /** The first deal's events, for the table to present. */
  readonly events: readonly GameEvent[];
  /** The stream that dealt the first hand, which deals the rest. */
  readonly shuffleRng: Rng;
}

/** A new game: the human, the partner across, and two opponents per the settings. */
export function startGame({
  rules,
  skill,
  opponents,
  seed,
  humanSeat = 0,
}: NewGameOptions): StartedGame {
  const shuffleRng = seed === null ? cryptoRng() : seededRng(seed);
  // A separate stream for opponent choice, so it never changes the deal.
  const pickRng = seed === null ? cryptoRng() : seededRng(hashSeed('opponents', seed));
  const [left, right] = resolveOpponents(opponents, pickRng);
  const opponent = (personaId: PersonaId): BotSpec => ({ role: 'opponent', personaId, skill });

  const firstDealer = shuffleRng.nextInt(4) as Seat;
  const { state, events } = newGame(rules, firstDealer, shuffleRng);
  const bots: Partial<Record<Seat, BotSpec>> = {
    [leftOf(humanSeat)]: opponent(left),
    [partnerOf(humanSeat)]: PARTNER_SPEC,
    [leftOf(partnerOf(humanSeat))]: opponent(right),
  };
  return { saved: { game: state, seats: { humanSeat, bots }, seed }, events, shuffleRng };
}

/**
 * The shuffle stream for a resumed game. Crypto as always (RU-2); a
 * seeded game gets a stream derived from its seed and the hand number,
 * so `?seed=N` sessions stay reproducible across a reload.
 */
export function resumeShuffleRng(saved: SavedGame): Rng {
  return saved.seed === null
    ? cryptoRng()
    : seededRng(hashSeed('resume', saved.seed, saved.game.handNumber));
}

/** The bot in each seat, or `null` for a human seat. */
export function botAt(seats: SeatSetup, seat: Seat): BotSpec | null {
  return seats.bots[seat] ?? null;
}

/** Writes the game after every applied action; clears it once the game is over. */
export class PersistenceSink implements EventSink {
  constructor(
    private readonly storage: StorageLike,
    private readonly setup: GameSetup
  ) {}

  handle(_events: readonly GameEvent[], state: GameState): void {
    if (state.winner !== null) clear(this.storage, GAME_STORE);
    else save(this.storage, GAME_STORE, { ...this.setup, game: state });
  }
}

const isSeat = (v: unknown): v is Seat => v === 0 || v === 1 || v === 2 || v === 3;
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

function isBotSpec(value: unknown): value is BotSpec {
  return (
    isRecord(value) &&
    (value.role === 'partner' || value.role === 'opponent' || value.role === 'coach') &&
    PERSONAS.some((p) => p.id === value.personaId) &&
    (value.skill === 'casual' || value.skill === 'standard' || value.skill === 'sharp')
  );
}

function isSeatSetup(value: unknown): value is SeatSetup {
  if (!isRecord(value) || !isSeat(value.humanSeat) || !isRecord(value.bots)) return false;
  const { humanSeat, bots } = value;
  return SEATS.every((seat) => (seat === humanSeat ? !(seat in bots) : isBotSpec(bots[seat])));
}

const PHASE_KINDS: readonly unknown[] = [
  'bidRound1',
  'dealerDiscard',
  'bidRound2',
  'play',
  'complete',
] satisfies HandPhase['kind'][];

const isCardList = (v: unknown): boolean => Array.isArray(v) && v.every(isCardId);

/**
 * A structural check, then the engine itself as the judge: a state it
 * cannot answer questions about is not loaded.
 */
function isGameState(value: unknown): value is GameState {
  if (!isRecord(value) || !isRecord(value.rules) || !isRecord(value.hand)) return false;
  const { hand, score } = value;
  const shaped =
    Array.isArray(score) &&
    score.length === 2 &&
    score.every(isCount) &&
    isSeat(value.dealer) &&
    isCount(value.handNumber) &&
    Array.isArray(value.completedHands) &&
    (value.winner === null || value.winner === 0 || value.winner === 1) &&
    isSeat(hand.dealer) &&
    isRecord(hand.phase) &&
    PHASE_KINDS.includes(hand.phase.kind) &&
    Array.isArray(hand.hands) &&
    hand.hands.length === 4 &&
    hand.hands.every(isCardList) &&
    isCardList(hand.kitty) &&
    (hand.kitty as unknown[]).length === 4 &&
    Array.isArray(hand.bids) &&
    Array.isArray(hand.tricks);
  if (!shaped) return false;
  const state = value as unknown as GameState;
  try {
    assertSupportedRules(state.rules);
    const actor = currentActor(state);
    if (actor !== null) legalActions(state, actor);
    SEATS.forEach((seat) => toPlayerView(state, seat));
    return true;
  } catch {
    return false;
  }
}

export function isSavedGame(value: unknown): value is SavedGame {
  return (
    isRecord(value) &&
    (value.seed === null || isCount(value.seed)) &&
    isSeatSetup(value.seats) &&
    isGameState(value.game)
  );
}

export const GAME_STORE: VersionedStore<SavedGame> = {
  key: 'leftbauer:game',
  schemaVersion: 1,
  migrations: {},
  isValid: isSavedGame,
};
