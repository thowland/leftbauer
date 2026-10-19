interface HomeScreenProps {
  readonly onNewGame: () => void;
}

/** The first screen: one tap to a new game — GF-1. Continue arrives with persistence in Sprint 5. */
export function HomeScreen({ onNewGame }: HomeScreenProps) {
  return (
    <main className="home" aria-label="Home">
      <h1 className="home-title">Left Bauer</h1>
      <p className="home-tagline">Euchre at the kitchen table.</p>
      <button type="button" className="button button-primary home-button" onClick={onNewGame}>
        New game
      </button>
    </main>
  );
}
