// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

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
import { DISGUISES, PERSONAS } from '../bots/personas';
import { isCardId, SUITS } from '../engine/cards';
import type { GameEvent } from '../engine/events';
import { currentActor, legalActions, newGame } from '../engine/game';
import { isRuleSet, type RuleSet } from '../engine/rules';
import { leftOf, partnerOf, SEATS, type Seat } from '../engine/seats';
import type { GameState, HandOutcome, HandPhase, UpcardStatus } from '../engine/state';
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
  // Johnny Blue's disguise comes from the same stream, after both seats are chosen.
  const opponent = (personaId: PersonaId): BotSpec =>
    personaId === 'johnny'
      ? {
          role: 'opponent',
          personaId,
          skill,
          playsAs: DISGUISES[pickRng.nextInt(DISGUISES.length)]!,
        }
      : { role: 'opponent', personaId, skill };

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
    (value.skill === 'casual' || value.skill === 'standard' || value.skill === 'sharp') &&
    // Johnny Blue always has a disguise, and nobody else has one.
    (value.personaId === 'johnny'
      ? DISGUISES.includes(value.playsAs as PersonaId)
      : value.playsAs === undefined)
  );
}

function isSeatSetup(value: unknown): value is SeatSetup {
  if (!isRecord(value) || !isSeat(value.humanSeat) || !isRecord(value.bots)) return false;
  const { humanSeat, bots } = value;
  return SEATS.every((seat) => (seat === humanSeat ? !(seat in bots) : isBotSpec(bots[seat])));
}

const PHASE_KINDS: readonly unknown[] = [
  'farmer',
  'bidRound1',
  'dealerDiscard',
  'bidRound2',
  'defendAlone',
  'play',
  'complete',
] satisfies HandPhase['kind'][];

const OUTCOMES: readonly unknown[] = [
  'made',
  'march',
  'lonerMade',
  'lonerSweep',
  'euchred',
  'euchredAlone',
  'euchredByLoneDefender',
] satisfies HandOutcome[];

const UPCARD_STATUSES: readonly unknown[] = [
  'faceUp',
  'pickedUp',
  'turnedDown',
  'setAside',
] satisfies UpcardStatus[];

const isTeam = (v: unknown): boolean => v === 0 || v === 1;
const isPair = (v: unknown): boolean => Array.isArray(v) && v.length === 2 && v.every(isCount);
const isCardList = (v: unknown): boolean => Array.isArray(v) && v.every(isCardId);
const isListOf = (v: unknown, item: (x: unknown) => boolean): boolean =>
  Array.isArray(v) && v.every(item);

function isHandResult(v: unknown): boolean {
  if (!isRecord(v)) return false;
  if (v.kind === 'redeal') return true;
  return (
    v.kind === 'scored' &&
    isTeam(v.makers) &&
    isPair(v.tricksWon) &&
    OUTCOMES.includes(v.outcome) &&
    isCount(v.points) &&
    isTeam(v.pointsTo)
  );
}

function isPhase(v: unknown): boolean {
  if (!isRecord(v) || !PHASE_KINDS.includes(v.kind)) return false;
  switch (v.kind) {
    case 'farmer':
      return isSeat(v.seat);
    case 'dealerDiscard':
      return true;
    case 'complete':
      return isHandResult(v.result);
    default:
      return isSeat(v.toAct);
  }
}

const isBid = (v: unknown): boolean =>
  isRecord(v) &&
  isSeat(v.seat) &&
  (v.round === 1 || v.round === 2) &&
  isRecord(v.action) &&
  (v.action.type === 'pass' || v.action.type === 'orderUp' || v.action.type === 'callTrump');

const isContract = (v: unknown): boolean =>
  isRecord(v) &&
  SUITS.includes(v.trump as never) &&
  isSeat(v.maker) &&
  (v.round === 1 || v.round === 2) &&
  typeof v.alone === 'boolean' &&
  (v.loneDefender === null || isSeat(v.loneDefender));

const isTrick = (v: unknown): boolean =>
  isRecord(v) &&
  isSeat(v.leader) &&
  isListOf(v.plays, (p) => isRecord(p) && isSeat(p.seat) && isCardId(p.card)) &&
  (v.plays as unknown[]).length <= 4 &&
  (v.winner === null || isSeat(v.winner));

/** No card is in two hands, or in a hand and a trick, or played twice. */
function noCardTwice(hand: GameState['hand']): boolean {
  const tricks = [...hand.tricks, ...(hand.currentTrick === null ? [] : [hand.currentTrick])];
  const held = [...hand.hands.flat(), ...tricks.flatMap((t) => t.plays.map((p) => p.card))];
  return new Set(held).size === held.length;
}

/**
 * A structural check of every field the table reads, then the engine
 * itself as the judge: a state it cannot answer questions about is not
 * loaded, so a bad save can never crash a screen.
 */
function isGameState(value: unknown): value is GameState {
  if (!isRecord(value) || !isRuleSet(value.rules) || !isRecord(value.hand)) return false;
  const { hand } = value;
  const shaped =
    isPair(value.score) &&
    isSeat(value.dealer) &&
    isCount(value.handNumber) &&
    isListOf(value.completedHands, isHandResult) &&
    (value.winner === null || isTeam(value.winner)) &&
    isSeat(hand.dealer) &&
    isPhase(hand.phase) &&
    Array.isArray(hand.hands) &&
    hand.hands.length === 4 &&
    hand.hands.every((cards) => isCardList(cards) && (cards as unknown[]).length <= 6) &&
    isCardList(hand.kitty) &&
    (hand.kitty as unknown[]).length === 4 &&
    (hand.farmerSwap === null ||
      (isRecord(hand.farmerSwap) &&
        isSeat(hand.farmerSwap.seat) &&
        isCardList(hand.farmerSwap.gave))) &&
    UPCARD_STATUSES.includes(hand.upcardStatus) &&
    isListOf(hand.bids, isBid) &&
    (hand.contract === null || isContract(hand.contract)) &&
    (hand.discard === null || isCardId(hand.discard)) &&
    isListOf(hand.tricks, isTrick) &&
    (hand.tricks as unknown[]).length <= 5 &&
    (hand.currentTrick === null || isTrick(hand.currentTrick));
  if (!shaped) return false;
  const state = value as unknown as GameState;
  if (!noCardTwice(state.hand)) return false;
  try {
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

/**
 * Version 2 (Sprint 9) settled the last house rules: the farmer's hand
 * became a plain on/off rule, a hand records any farmer's swap, and a
 * contract records any lone defender. A version 1 game had none of them.
 */
function addSprint9Fields(blob: Record<string, unknown>): Record<string, unknown> {
  const game = isRecord(blob.game) ? blob.game : {};
  const rules = isRecord(game.rules) ? game.rules : {};
  const hand = isRecord(game.hand) ? game.hand : {};
  const contract = isRecord(hand.contract) ? { ...hand.contract, loneDefender: null } : null;
  return {
    ...blob,
    schemaVersion: 2,
    game: {
      ...game,
      rules: { ...rules, farmersHand: false },
      hand: { ...hand, farmerSwap: null, contract },
    },
  };
}

export const GAME_STORE: VersionedStore<SavedGame> = {
  key: 'leftbauer:game',
  schemaVersion: 2,
  migrations: { 1: addSprint9Fields },
  isValid: isSavedGame,
};
