import { sortHand, type CardId } from '../engine/cards';
import type { Deal } from '../engine/deal';
import { SEATS, partnerOf, type Seat } from '../engine/seats';
import { Card } from './Card';
import { screenPosition, type ScreenPosition } from './layout';

interface TableScreenProps {
  readonly deal: Deal;
  readonly dealer: Seat;
  readonly humanSeat: Seat;
  readonly onDealAgain: () => void;
}

/**
 * The table — VP-1, first pass. Sprint 1 shows a static deal: the
 * human's hand face up, the other hands face down, and the upcard on
 * the kitty. Bidding and play arrive in Sprints 2 and 3.
 */
export function TableScreen({ deal, dealer, humanSeat, onDealAgain }: TableScreenProps) {
  const [upcard, ...buried] = deal.kitty;
  return (
    <main className="table" aria-label="Euchre table">
      <header className="score-bar">
        <h1 className="brand">Left Bauer</h1>
        <dl className="score" aria-label="Score">
          <div>
            <dt>Us</dt>
            <dd>0</dd>
          </div>
          <div>
            <dt>Them</dt>
            <dd>0</dd>
          </div>
        </dl>
        <button type="button" className="button" onClick={onDealAgain}>
          Deal again
        </button>
      </header>

      {SEATS.filter((s) => s !== humanSeat).map((seat) => (
        <OpponentSeat
          key={seat}
          position={screenPosition(seat, humanSeat)}
          name={seatName(seat, humanSeat)}
          cardCount={deal.hands[seat].length}
          isDealer={seat === dealer}
        />
      ))}

      <section className="center" aria-label="Kitty">
        <div className="kitty">
          {buried.map((_, i) => (
            <Card key={i} card={null} className="kitty-card" />
          ))}
          {upcard !== undefined && <Card card={upcard} className="upcard" />}
        </div>
        <p className="center-label">Upcard</p>
      </section>

      <section className="seat seat-bottom" aria-label="Your hand">
        <SeatLabel name="You" isDealer={humanSeat === dealer} />
        <div className="hand">
          {sortHand(deal.hands[humanSeat], null).map((card: CardId) => (
            <Card key={card} card={card} className="hand-card" />
          ))}
        </div>
      </section>
    </main>
  );
}

function seatName(seat: Seat, humanSeat: Seat): string {
  return seat === partnerOf(humanSeat) ? 'Partner' : 'Opponent';
}

interface OpponentSeatProps {
  readonly position: ScreenPosition;
  readonly name: string;
  readonly cardCount: number;
  readonly isDealer: boolean;
}

function OpponentSeat({ position, name, cardCount, isDealer }: OpponentSeatProps) {
  return (
    <section className={`seat seat-${position}`} aria-label={`${name} (${position})`}>
      <SeatLabel name={name} isDealer={isDealer} />
      <div className="backs">
        {Array.from({ length: cardCount }, (_, i) => (
          <Card key={i} card={null} className="back-card" />
        ))}
      </div>
    </section>
  );
}

function SeatLabel({ name, isDealer }: { name: string; isDealer: boolean }) {
  return (
    <p className="seat-label">
      <span>{name}</span>
      {isDealer && (
        <span className="dealer-chip" title="Dealer">
          Dealer
        </span>
      )}
    </p>
  );
}
