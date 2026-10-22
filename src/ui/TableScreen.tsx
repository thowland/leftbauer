// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import { useState, type PointerEvent, type ReactNode } from 'react';
import { isBidAction, type Action } from '../engine/actions';
import { sortHand, type CardId } from '../engine/cards';
import type { Hands } from '../engine/deal';
import { SEATS, teamOf, type Seat } from '../engine/seats';
import type { Trick } from '../engine/state';
import type { PlayerView } from '../engine/view';
import { SUIT_NAMES } from '../assets/manifest';
import { tricksWon } from '../engine/scoring';
import { BidPanel } from './BidPanel';
import { Card } from './Card';
import { seatStatus, turnPrompt } from './describe';
import type { Hint } from '../coach/hint';
import type { Cue } from './game/presenter';
import { DefendAlonePanel, FarmerPanel } from './HouseRulePanels';
import { LastTrickPeek } from './LastTrickPeek';
import { PlayerHand } from './PlayerHand';
import { namesOf, screenPosition, seatName, type SeatInfo } from './layout';
import { dealt, flyFrom, flyTo, intoHand, type CardMotion } from './motion';
import { SuitIcon } from './SuitIcon';

interface TableScreenProps {
  /** The table as the human sees it. */
  readonly view: PlayerView;
  /** Dev mode only: every seat's cards, shown face up. */
  readonly revealed?: Hands | null;
  /** Extra controls for the score bar (for example, Deal again). */
  readonly controls?: ReactNode;
  /** The human's legal actions while the table waits for them, else `null`. */
  readonly legal?: readonly Action[] | null;
  readonly onAction?: (action: Action) => void;
  /** Who sits where (names and personas); positional names when omitted. */
  readonly seats?: readonly SeatInfo[] | undefined;
  /** Play a card on the first tap (GF-2). */
  readonly oneTap?: boolean;
  /** The table was tapped away from any control: speed up the trick (GF-4). */
  readonly onHurry?: () => void;
  /** The Presenter's current animation cue (SA-1). */
  readonly cue?: Cue | null;
  /** Ask the coach (CO-1); the Hint control is hidden when omitted (CO-3). */
  readonly onHint?: (() => void) | undefined;
  /** The coach's suggestion for this turn, shown in place. */
  readonly hint?: Hint | null;
}

/** Taps on controls and cards are theirs, not a request to hurry. */
const CONTROLS = 'button, input, select, label, a, .dialog-backdrop';

/**
 * The table — VP-1. Renders entirely from the human's `PlayerView`, so it
 * can only show what the human is entitled to see (unless `revealed` is
 * passed by the dev panel).
 */
export function TableScreen({
  view,
  revealed = null,
  controls,
  legal = null,
  onAction = () => {},
  seats,
  oneTap = false,
  onHurry,
  cue = null,
  onHint,
  hint = null,
}: TableScreenProps) {
  const human = view.seat;
  const us = teamOf(human);
  const them = us === 0 ? 1 : 0;
  const trump = view.contract?.trump ?? null;
  const bids = legal?.filter(isBidAction) ?? [];
  const choosable = (legal ?? []).flatMap((a) =>
    a.type === 'play' || a.type === 'discard' ? [a.card] : []
  );
  const choose = (card: CardId) =>
    onAction(view.phase === 'dealerDiscard' ? { type: 'discard', card } : { type: 'play', card });
  // A farmer's hand: the cards picked to swap, for this hand only.
  const farmer = legal?.some((a) => a.type === 'farmerExchange') ?? false;
  const defending = legal?.some((a) => a.type === 'defendAlone') ?? false;
  const [picks, setPicks] = useState<{ hand: number; cards: readonly CardId[] }>({
    hand: 0,
    cards: [],
  });
  const picked = farmer && picks.hand === view.handNumber ? picks.cards : [];
  const togglePick = (card: CardId) =>
    setPicks({
      hand: view.handNumber,
      cards: picked.includes(card)
        ? picked.filter((c) => c !== card)
        : picked.length < 3
          ? [...picked, card]
          : picked,
    });
  const hintedCards =
    hint === null
      ? []
      : hint.action.type === 'play' || hint.action.type === 'discard'
        ? [hint.action.card]
        : hint.action.type === 'farmerExchange'
          ? hint.action.cards
          : [];
  const tricks = tricksWon(view.tricks);
  const hurry = (event: PointerEvent<HTMLElement>) => {
    if (!(event.target as Element).closest(CONTROLS)) onHurry?.();
  };
  return (
    <main className="table" aria-label="Euchre table" onPointerDown={onHurry && hurry}>
      <header className="score-bar">
        <h1 className="brand">Left Bauer</h1>
        <dl className="score" aria-label="Score">
          <div>
            <dt>Us</dt>
            <dd>{view.score[us]}</dd>
          </div>
          <div>
            <dt>Them</dt>
            <dd>{view.score[them]}</dd>
          </div>
          {/* Trump and Tricks hold their places from the deal, so the score never moves. */}
          <div
            className="trump"
            aria-label={trump === null ? 'Trump: not named yet' : `Trump: ${SUIT_NAMES[trump]}`}
          >
            <dt>Trump</dt>
            <dd>
              {trump === null ? (
                '—'
              ) : (
                <svg viewBox="0 0 100 100" className="trump-icon" aria-hidden="true">
                  <SuitIcon suit={trump} x={50} y={50} size={100} color="var(--ink-on-felt)" />
                </svg>
              )}
            </dd>
          </div>
          <div
            className="tricks"
            aria-label={
              view.contract === null
                ? 'Tricks: none yet'
                : `Tricks: us ${tricks[us]}, them ${tricks[them]}`
            }
          >
            <dt>Tricks</dt>
            <dd>{view.contract === null ? '—' : `${tricks[us]}–${tricks[them]}`}</dd>
          </div>
        </dl>
        <p className="score-target">Game to {view.rules.targetScore}</p>
        {controls !== undefined && <div className="score-controls">{controls}</div>}
      </header>

      {SEATS.filter((s) => s !== human).map((seat) => (
        <OtherSeat
          key={seat}
          seat={seat}
          view={view}
          cards={revealed?.[seat] ?? null}
          info={seats?.[seat]}
          cue={cue}
        />
      ))}

      <section className="center" aria-label="Table center">
        <CenterContents view={view} cue={cue} />
        {/* Hint comes first and the row runs right to left, so Last trick never moves it. */}
        <div className="center-corner">
          {onHint !== undefined && legal !== null && (
            <button
              type="button"
              className="button button-small"
              onClick={onHint}
              disabled={hint !== null}
            >
              Hint
            </button>
          )}
          {view.phase === 'play' && (
            <LastTrickPeek tricks={view.tricks} humanSeat={human} names={namesOf(seats)} />
          )}
        </div>
      </section>

      <section className="action-bar" aria-label="Your turn">
        <p className={`turn-prompt${hint ? ' hint-text' : ''}`} aria-live="polite">
          {hint ? `Hint: ${hint.reasonText}` : turnPrompt(view, legal, namesOf(seats))}
        </p>
        <div className="action-panel">
          {bids.length > 0 && (
            <BidPanel
              legal={bids}
              isDealer={view.dealer === human}
              onBid={onAction}
              hinted={hint !== null && isBidAction(hint.action) ? hint.action : null}
            />
          )}
          {farmer && (
            <FarmerPanel
              picked={picked}
              onSwap={() => onAction({ type: 'farmerExchange', cards: picked })}
              onKeep={() => onAction({ type: 'farmerExchange', cards: [] })}
              hinted={hint?.action ?? null}
            />
          )}
          {defending && (
            <DefendAlonePanel
              onChoose={(accept) => onAction({ type: 'defendAlone', accept })}
              hinted={hint?.action ?? null}
            />
          )}
        </div>
      </section>

      <section
        className={seatClasses('bottom', view, human)}
        aria-label="Your hand"
        aria-current={view.toAct === human ? 'true' : undefined}
      >
        <SeatLabel view={view} seat={human} info={seats?.[human]} />
        <div className="seat-cards">
          <PlayerHand
            cards={sortHand(view.myHand, trump)}
            trump={trump}
            choosable={choosable}
            onChoose={choose}
            oneTap={oneTap}
            motionFor={(card, index) => dealt(cue, human, index, human) ?? intoHand(cue, card)}
            hinted={hintedCards}
            picking={farmer ? { picked, onToggle: togglePick } : null}
          />
        </div>
      </section>
    </main>
  );
}

function seatClasses(position: string, view: PlayerView, seat: Seat): string {
  const classes = ['seat', `seat-${position}`];
  if (view.toAct === seat) classes.push('seat-active');
  if (view.sittingOut.includes(seat)) classes.push('seat-out');
  return classes.join(' ');
}

interface OtherSeatProps {
  readonly seat: Seat;
  readonly view: PlayerView;
  readonly cards: readonly CardId[] | null;
  readonly info: SeatInfo | undefined;
  readonly cue: Cue | null;
}

function OtherSeat({ seat, view, cards, info, cue }: OtherSeatProps) {
  const position = screenPosition(seat, view.seat);
  const trump = view.contract?.trump ?? null;
  return (
    <section
      className={seatClasses(position, view, seat)}
      aria-label={seatName(seat, view.seat)}
      aria-current={view.toAct === seat ? 'true' : undefined}
    >
      <SeatLabel view={view} seat={seat} info={info} />
      <div className="seat-cards">
        <div className="backs">
          {cards
            ? sortHand(cards, trump).map((card, i) => (
                <Card
                  key={card}
                  card={card}
                  className="back-card"
                  motion={dealt(cue, seat, i, view.seat)}
                />
              ))
            : Array.from({ length: view.handSizes[seat] }, (_, i) => (
                <Card
                  key={i}
                  card={null}
                  className="back-card"
                  motion={dealt(cue, seat, i, view.seat)}
                />
              ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The seat's name, with a reserved row beneath it for its status (Pass,
 * Called hearts…), so a status appearing never moves the name or cards.
 */
function SeatLabel({
  view,
  seat,
  info,
}: {
  view: PlayerView;
  seat: Seat;
  info?: SeatInfo | undefined;
}) {
  const status = seatStatus(view, seat);
  const persona = info?.persona ?? null;
  return (
    <div className="seat-label">
      <span className="seat-name" title={persona?.tagline}>
        {info !== undefined && persona !== null && (
          <span
            className="monogram"
            style={{ background: `var(${persona.colorToken})` }}
            aria-hidden="true"
          >
            {info.name[0]}
          </span>
        )}
        {info?.name ?? seatName(seat, view.seat)}
        {view.dealer === seat && <DealerButton />}
      </span>
      <span className="seat-status">
        {status !== null && <span className="chip status-chip">{status}</span>}
      </span>
    </div>
  );
}

/** The dealer's disc, after the seat's name, clear of the cards. */
function DealerButton() {
  return (
    <span className="dealer-button" title="Dealer">
      <span aria-hidden="true">D</span>
      <span className="visually-hidden">Dealer</span>
    </span>
  );
}

/** The kitty while bidding; the trick (or the last one won) during play. */
function CenterContents({ view, cue }: { view: PlayerView; cue: Cue | null }) {
  const human = view.seat;
  if (view.phase === 'farmer' || view.phase === 'bidRound1' || view.phase === 'bidRound2') {
    const faceUp = view.upcardStatus === 'faceUp';
    const deal = dealt(cue, null, 0, human);
    return (
      <>
        <div className="kitty">
          {[0, 1, 2].map((i) => (
            <Card key={i} card={null} className="kitty-card" motion={deal} />
          ))}
          <Card
            card={faceUp ? view.upcard : null}
            className="upcard"
            motion={cue?.kind === 'turnDown' ? { className: 'flip', style: {} } : deal}
          />
        </div>
        <p className="center-label">{faceUp ? 'Upcard' : 'Turned down'}</p>
      </>
    );
  }
  if (view.phase === 'dealerDiscard') {
    return (
      <>
        {cue?.kind === 'pickup' && (
          <div className="center-flight" aria-hidden="true">
            <Card card={cue.card} className="flight-card" motion={flyTo(cue.dealer, human)} />
          </div>
        )}
        <p className="center-label">Dealer is discarding</p>
      </>
    );
  }
  const trick = view.currentTrick ?? view.tricks.at(-1) ?? null;
  const previous = view.tricks.at(-1);
  // Leading a new trick sweeps the last one to whoever won it.
  const sweeping =
    cue?.kind === 'play' && view.currentTrick?.plays.length === 1 && previous !== undefined
      ? previous
      : null;
  return (
    <>
      {cue?.kind === 'discard' && (
        <div className="center-flight" aria-hidden="true">
          <Card card={null} className="flight-card" motion={flyFrom(cue.dealer, human)} />
        </div>
      )}
      {sweeping !== null && sweeping.winner !== null && (
        <div className="center-flight" aria-hidden="true">
          <TrickView
            trick={sweeping}
            humanSeat={human}
            done
            motion={flyTo(sweeping.winner, human)}
          />
        </div>
      )}
      {trick === null ? (
        view.phase === 'play' && <p className="center-label">Lead</p>
      ) : (
        <TrickView trick={trick} humanSeat={human} done={view.currentTrick === null} cue={cue} />
      )}
    </>
  );
}

interface TrickViewProps {
  readonly trick: Trick;
  readonly humanSeat: Seat;
  readonly done: boolean;
  /** Animates the card just played. */
  readonly cue?: Cue | null;
  /** Moves the whole trick (the sweep). */
  readonly motion?: CardMotion;
}

function TrickView({ trick, humanSeat, done, cue = null, motion }: TrickViewProps) {
  const classes = ['trick', done && 'trick-done', motion?.className].filter(Boolean).join(' ');
  return (
    <div className={classes} style={motion?.style} aria-label={done ? 'Last trick' : 'Trick'}>
      {trick.plays.map(({ seat, card }) => (
        <div
          key={card}
          className={`trick-slot trick-${screenPosition(seat, humanSeat)}${
            trick.winner === seat ? ' trick-winner' : ''
          }`}
        >
          <Card
            card={card}
            className="trick-card"
            motion={
              cue?.kind === 'play' && cue.card === card ? flyFrom(seat, humanSeat) : undefined
            }
          />
        </div>
      ))}
    </div>
  );
}
