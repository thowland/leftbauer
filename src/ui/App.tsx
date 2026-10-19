import { useState, type CSSProperties } from 'react';
import { deal, type Deal } from '../engine/deal';
import { leftOf, type Seat } from '../engine/seats';
import { CARD_ROOM, type Theme } from '../themes/cardRoom';
import { cryptoRng, type Rng } from '../util/rng';
import { TableScreen } from './TableScreen';

const HUMAN_SEAT: Seat = 0;
/** Start with the dealer on the human's right, so the human receives the first packet. */
const FIRST_DEALER: Seat = 3;

interface AppProps {
  /** Injected for tests; production shuffles use crypto (RU-2). */
  readonly rng?: Rng;
  readonly theme?: Theme;
}

interface TableState {
  readonly dealer: Seat;
  readonly deal: Deal;
}

export function App({ rng, theme = CARD_ROOM }: AppProps) {
  const [source] = useState<Rng>(() => rng ?? cryptoRng());
  const [table, setTable] = useState<TableState>(() => ({
    dealer: FIRST_DEALER,
    deal: deal(source, FIRST_DEALER),
  }));

  const dealAgain = () => {
    const dealer = leftOf(table.dealer);
    setTable({ dealer, deal: deal(source, dealer) });
  };

  return (
    <div className="app" data-theme={theme.id} style={theme.vars as CSSProperties}>
      <TableScreen
        deal={table.deal}
        dealer={table.dealer}
        humanSeat={HUMAN_SEAT}
        onDealAgain={dealAgain}
      />
    </div>
  );
}
