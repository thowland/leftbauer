import type { ReactNode } from 'react';
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
import { PlayerHand } from './PlayerHand';
import { screenPosition, seatName } from './layout';
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
}

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
  const tricks = tricksWon(view.tricks);
  return (
    <main className="table" aria-label="Euchre table">
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
          {trump !== null && (
            <div className="trump" aria-label={`Trump: ${SUIT_NAMES[trump]}`}>
              <dt>Trump</dt>
              <dd>
                <svg viewBox="0 0 100 100" className="trump-icon" aria-hidden="true">
                  <SuitIcon suit={trump} x={50} y={50} size={100} color="var(--ink-on-felt)" />
                </svg>
              </dd>
            </div>
          )}
          {view.contract !== null && (
            <div className="tricks" aria-label={`Tricks: us ${tricks[us]}, them ${tricks[them]}`}>
              <dt>Tricks</dt>
              <dd>
                {tricks[us]}–{tricks[them]}
              </dd>
            </div>
          )}
        </dl>
        {controls}
      </header>

      {SEATS.filter((s) => s !== human).map((seat) => (
        <OtherSeat key={seat} seat={seat} view={view} cards={revealed?.[seat] ?? null} />
      ))}

      <section className="center" aria-label="Table center">
        <CenterContents view={view} />
      </section>

      <section className="action-bar" aria-label="Your turn">
        <p className="turn-prompt" aria-live="polite">
          {turnPrompt(view, legal)}
        </p>
        {bids.length > 0 && (
          <BidPanel legal={bids} isDealer={view.dealer === human} onBid={onAction} />
        )}
      </section>

      <section
        className={seatClasses('bottom', view, human)}
        aria-label="Your hand"
        aria-current={view.toAct === human ? 'true' : undefined}
      >
        <SeatLabel view={view} seat={human} />
        <PlayerHand
          cards={sortHand(view.myHand, trump)}
          trump={trump}
          choosable={choosable}
          onChoose={choose}
        />
      </section>
    </main>
  );
}

function seatClasses(position: string, view: PlayerView, seat: Seat): string {
  const classes = ['seat', `seat-${position}`];
  if (view.toAct === seat) classes.push('seat-active');
  if (view.sittingOut === seat) classes.push('seat-out');
  return classes.join(' ');
}

interface OtherSeatProps {
  readonly seat: Seat;
  readonly view: PlayerView;
  readonly cards: readonly CardId[] | null;
}

function OtherSeat({ seat, view, cards }: OtherSeatProps) {
  const position = screenPosition(seat, view.seat);
  const trump = view.contract?.trump ?? null;
  return (
    <section
      className={seatClasses(position, view, seat)}
      aria-label={seatName(seat, view.seat)}
      aria-current={view.toAct === seat ? 'true' : undefined}
    >
      <SeatLabel view={view} seat={seat} />
      <div className="backs">
        {cards
          ? sortHand(cards, trump).map((card) => (
              <Card key={card} card={card} className="back-card" />
            ))
          : Array.from({ length: view.handSizes[seat] }, (_, i) => (
              <Card key={i} card={null} className="back-card" />
            ))}
      </div>
    </section>
  );
}

function SeatLabel({ view, seat }: { view: PlayerView; seat: Seat }) {
  const status = seatStatus(view, seat);
  return (
    <p className="seat-label">
      <span>{seatName(seat, view.seat)}</span>
      {view.dealer === seat && (
        <span className="chip dealer-chip" title="Dealer">
          Dealer
        </span>
      )}
      {status !== null && <span className="chip status-chip">{status}</span>}
    </p>
  );
}

/** The kitty while bidding; the trick (or the last one won) during play. */
function CenterContents({ view }: { view: PlayerView }) {
  if (view.phase === 'bidRound1' || view.phase === 'bidRound2') {
    const faceUp = view.upcardStatus === 'faceUp';
    return (
      <>
        <div className="kitty">
          {[0, 1, 2].map((i) => (
            <Card key={i} card={null} className="kitty-card" />
          ))}
          <Card card={faceUp ? view.upcard : null} className="upcard" />
        </div>
        <p className="center-label">{faceUp ? 'Upcard' : 'Turned down'}</p>
      </>
    );
  }
  if (view.phase === 'dealerDiscard') {
    return <p className="center-label">Dealer is discarding</p>;
  }
  const trick = view.currentTrick ?? view.tricks.at(-1) ?? null;
  return trick === null ? (
    <p className="center-label">Lead</p>
  ) : (
    <TrickView trick={trick} humanSeat={view.seat} done={view.currentTrick === null} />
  );
}

function TrickView({ trick, humanSeat, done }: { trick: Trick; humanSeat: Seat; done: boolean }) {
  return (
    <div className={`trick${done ? ' trick-done' : ''}`} aria-label={done ? 'Last trick' : 'Trick'}>
      {trick.plays.map(({ seat, card }) => (
        <div
          key={card}
          className={`trick-slot trick-${screenPosition(seat, humanSeat)}${
            trick.winner === seat ? ' trick-winner' : ''
          }`}
        >
          <Card card={card} className="trick-card" />
        </div>
      ))}
    </div>
  );
}
