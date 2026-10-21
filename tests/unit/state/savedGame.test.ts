import { describe, expect, it } from 'vitest';
import { PARTNER_SPEC } from '../../../src/bots/factory';
import { STANDARD_RULES } from '../../../src/engine/rules';
import { load, memoryStorage, save } from '../../../src/state/persistence';
import {
  botAt,
  GAME_STORE,
  isSavedGame,
  PersistenceSink,
  resumeShuffleRng,
  startGame,
  type NewGameOptions,
  type SavedGame,
} from '../../../src/state/savedGame';
import { finishHand, gameFromDeck } from '../../helpers/engine';

const OPTIONS: NewGameOptions = {
  rules: STANDARD_RULES,
  skill: 'standard',
  opponents: { left: 'rusty', right: 'soopy' },
  seed: 11,
};

const saved = (): SavedGame => startGame(OPTIONS).saved;

/** A JSON copy with one change, as a corrupted save would arrive. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a corrupted save has no type
function tampered(change: (blob: Record<string, any>) => void): unknown {
  const blob = JSON.parse(JSON.stringify(saved()));
  change(blob);
  return blob;
}

describe('startGame', () => {
  it('seats the partner across from the human and the opponents to each side', () => {
    const { seats } = saved();
    expect(seats.humanSeat).toBe(0);
    expect(botAt(seats, 0)).toBeNull();
    expect(botAt(seats, 1)).toEqual({ role: 'opponent', personaId: 'rusty', skill: 'standard' });
    expect(botAt(seats, 2)).toEqual(PARTNER_SPEC);
    expect(botAt(seats, 3)?.personaId).toBe('soopy');
  });

  it('gives Johnny Blue a disguise for the game, the same one for the same seed', () => {
    const johnny = (seed: number) =>
      botAt(
        startGame({ ...OPTIONS, opponents: { left: 'johnny', right: 'johnny' }, seed }).saved.seats,
        1
      );
    const disguises = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const spec = johnny(seed)!;
      expect(spec.personaId).toBe('johnny');
      expect(johnny(seed)).toEqual(spec);
      disguises.add(spec.playsAs!);
    }
    expect([...disguises].sort()).toEqual(['rusty', 'shrubs', 'smooth', 'soopy']);
    // Nobody else wears one.
    expect(botAt(saved().seats, 1)!.playsAs).toBeUndefined();
  });

  it('seats around a human in any seat', () => {
    const { seats } = startGame({ ...OPTIONS, humanSeat: 2 }).saved;
    expect(botAt(seats, 2)).toBeNull();
    expect(botAt(seats, 3)?.personaId).toBe('rusty');
    expect(botAt(seats, 0)).toEqual(PARTNER_SPEC);
    expect(botAt(seats, 1)?.personaId).toBe('soopy');
  });

  it('deals the first hand reproducibly from a seed, and from crypto otherwise', () => {
    const a = startGame(OPTIONS);
    expect(a.saved.game).toEqual(startGame(OPTIONS).saved.game);
    expect(a.events).toEqual([expect.objectContaining({ type: 'handDealt', handNumber: 1 })]);
    expect(startGame({ ...OPTIONS, seed: null }).saved.seed).toBeNull();
  });
});

describe('resumeShuffleRng', () => {
  it('derives a seeded stream from the seed and hand number', () => {
    const draw = (s: SavedGame) =>
      Array.from({ length: 5 }, () => resumeShuffleRng(s).nextInt(1e6));
    const s = saved();
    expect(draw(s)).toEqual(draw(s));
    const later = { ...s, game: { ...s.game, handNumber: 2 } };
    expect(resumeShuffleRng(later).nextInt(1e6)).not.toBe(resumeShuffleRng(s).nextInt(1e6));
    expect(resumeShuffleRng({ ...s, seed: null }).nextInt(10)).toBeLessThan(10);
  });
});

describe('PersistenceSink (PE-1)', () => {
  it('saves after every action and clears the save once the game is won', () => {
    const storage = memoryStorage();
    const { seats, seed, game } = saved();
    const sink = new PersistenceSink(storage, { seats, seed });

    sink.handle([], game);
    expect(load(storage, GAME_STORE)).toEqual({ seats, seed, game });

    sink.handle([], { ...game, winner: 0 });
    expect(load(storage, GAME_STORE)).toBeNull();
  });
});

describe('isSavedGame', () => {
  it('accepts a save through a JSON round trip, mid-hand and between hands', () => {
    expect(isSavedGame(JSON.parse(JSON.stringify(saved())))).toBe(true);
    const between = { ...saved(), game: finishHand(gameFromDeck(), (legal) => legal[0]!) };
    expect(isSavedGame(JSON.parse(JSON.stringify(between)))).toBe(true);
    const storage = memoryStorage();
    save(storage, GAME_STORE, between);
    expect(load(storage, GAME_STORE)).toEqual(between);
  });

  it('rejects corrupted saves', () => {
    const corrupt: unknown[] = [
      null,
      tampered((b) => (b.seed = -1)),
      tampered((b) => (b.seed = 'x')),
      tampered((b) => (b.seats = null)),
      tampered((b) => (b.seats.humanSeat = 4)),
      tampered((b) => (b.seats.bots = [])),
      tampered((b) => (b.seats.bots[0] = PARTNER_SPEC)),
      tampered((b) => delete b.seats.bots[1]),
      tampered((b) => (b.seats.bots[1].role = 'boss')),
      tampered((b) => (b.seats.bots[1].personaId = 'nobody')),
      tampered((b) => (b.seats.bots[1].personaId = 'johnny')),
      tampered((b) => (b.seats.bots[1].playsAs = 'soopy')),
      tampered((b) => Object.assign(b.seats.bots[1], { personaId: 'johnny', playsAs: 'partner' })),
      tampered((b) => (b.seats.bots[1].skill = 'grandmaster')),
      tampered((b) => (b.game = null)),
      tampered((b) => (b.game.rules = null)),
      tampered((b) => (b.game.hand = null)),
      tampered((b) => (b.game.score = [0])),
      tampered((b) => (b.game.score = [0, -1])),
      tampered((b) => (b.game.dealer = 7)),
      tampered((b) => (b.game.handNumber = 1.5)),
      tampered((b) => (b.game.completedHands = {})),
      tampered((b) => (b.game.winner = 2)),
      tampered((b) => (b.game.hand.dealer = null)),
      tampered((b) => (b.game.hand.phase = 'bidRound1')),
      tampered((b) => (b.game.hand.hands = b.game.hand.hands.slice(1))),
      tampered((b) => (b.game.hand.hands[0][0] = 'ZZ')),
      tampered((b) => (b.game.hand.kitty = b.game.hand.kitty.slice(1))),
      tampered((b) => (b.game.hand.bids = null)),
      tampered((b) => (b.game.hand.tricks = null)),
      // Shaped right, but the engine cannot work with it.
      tampered((b) => (b.game.rules.farmersHand = null)),
      tampered((b) => (b.game.hand.farmerSwap = { seat: 0, gave: ['ZZ'] })),
      tampered((b) => (b.game.hand.contract = { trump: 'H' })),
      tampered((b) => {
        b.game.hand.phase = { kind: 'play', toAct: 0 };
        b.game.hand.contract = { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: null };
        b.game.hand.currentTrick = { leader: 0, plays: null, winner: null };
      }),
      tampered((b) => (b.game.hand.phase = { kind: 'mystery' })),
    ];
    corrupt.forEach((value, i) => expect(isSavedGame(value), `case ${i}`).toBe(false));
  });
});

describe('saved game migrations', () => {
  it('brings a version 1 save up to date', () => {
    const current = saved();
    const contract = { trump: 'H', maker: 1, round: 1, alone: false };
    const v1 = JSON.parse(JSON.stringify(current));
    v1.game.rules.farmersHand = null;
    delete v1.game.hand.farmerSwap;
    v1.game.hand.phase = { kind: 'play', toAct: 1 };
    v1.game.hand.contract = contract;
    const storage = memoryStorage();
    storage.setItem(GAME_STORE.key, JSON.stringify({ schemaVersion: 1, ...v1 }));
    const loaded = load(storage, GAME_STORE)!;
    expect(loaded.game.rules).toEqual(STANDARD_RULES);
    expect(loaded.game.hand.farmerSwap).toBeNull();
    expect(loaded.game.hand.contract).toEqual({ ...contract, loneDefender: null });
  });

  it('keeps a version 1 save without a contract', () => {
    const v1 = JSON.parse(JSON.stringify(saved()));
    v1.game.rules.farmersHand = null;
    delete v1.game.hand.farmerSwap;
    const storage = memoryStorage();
    storage.setItem(GAME_STORE.key, JSON.stringify({ schemaVersion: 1, ...v1 }));
    expect(load(storage, GAME_STORE)?.game).toEqual(saved().game);
  });

  it('discards a version 1 blob with no game', () => {
    const storage = memoryStorage();
    storage.setItem(GAME_STORE.key, JSON.stringify({ schemaVersion: 1, seed: null }));
    expect(load(storage, GAME_STORE)).toBeNull();
  });
});
