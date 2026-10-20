interface SoundToggleProps {
  readonly on: boolean;
  readonly onToggle: () => void;
}

/** The mute control on the table (SA-3); the setting persists with the others. */
export function SoundToggle({ on, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      className="button button-small button-icon"
      aria-label="Sound"
      aria-pressed={on}
      title={on ? 'Sound on' : 'Sound off'}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="sound-icon">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {on ? (
          <path
            d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M16 9l5 6M21 9l-5 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}
