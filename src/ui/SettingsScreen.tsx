import type { PersonaId, SkillLevel } from '../bots/bot';
import { OPPONENT_IDS, personaById } from '../bots/personas';
import {
  PACING_OPTIONS,
  SKILL_OPTIONS,
  type OpponentChoice,
  type OpponentSettings,
  type Settings,
} from '../state/settings';

interface SettingsScreenProps {
  readonly settings: Settings;
  readonly onChange: (settings: Settings) => void;
  readonly onDone: () => void;
  /** Opened from a game: the label of the way back. */
  readonly doneLabel?: string;
}

const SKILL_TEXT: Record<SkillLevel, { label: string; detail: string }> = {
  casual: { label: 'Casual', detail: 'Opponents slip up now and then.' },
  standard: { label: 'Standard', detail: 'Opponents play sound, conventional Euchre.' },
  sharp: { label: 'Sharp', detail: 'Opponents look ahead.' },
};

const SIDES = [
  { side: 'left', label: 'Left opponent' },
  { side: 'right', label: 'Right opponent' },
] as const;

/** Settings — UI-1 (first pass). Every change is saved as it is made (PE-3). */
export function SettingsScreen({
  settings,
  onChange,
  onDone,
  doneLabel = 'Done',
}: SettingsScreenProps) {
  const set = (change: Partial<Settings>) => onChange({ ...settings, ...change });
  const setOpponent = (side: keyof OpponentSettings, choice: OpponentChoice) =>
    set({ opponents: { ...settings.opponents, [side]: choice } });

  return (
    <main className="settings" aria-label="Settings">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <button type="button" className="button button-primary" onClick={onDone}>
          {doneLabel}
        </button>
      </header>

      <fieldset className="settings-group">
        <legend>Opponents</legend>
        {SIDES.map(({ side, label }) => {
          const choice = settings.opponents[side];
          const other = settings.opponents[side === 'left' ? 'right' : 'left'];
          return (
            <div key={side} className="settings-row">
              <label htmlFor={`opponent-${side}`}>{label}</label>
              <select
                id={`opponent-${side}`}
                value={choice}
                onChange={(e) => setOpponent(side, e.target.value as OpponentChoice)}
              >
                <option value="random">Random</option>
                {OPPONENT_IDS.map((id: PersonaId) => (
                  <option key={id} value={id} disabled={id === other}>
                    {personaById(id).name}
                  </option>
                ))}
              </select>
              <p className="settings-detail">
                {choice === 'random'
                  ? 'A different opponent each game.'
                  : personaById(choice).tagline}
              </p>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="settings-group">
        <legend>Opponent difficulty</legend>
        {SKILL_OPTIONS.map((skill) => (
          <label key={skill} className="settings-choice">
            <input
              type="radio"
              name="skill"
              checked={settings.skill === skill}
              onChange={() => set({ skill })}
            />
            <span>
              {SKILL_TEXT[skill].label}
              <span className="settings-detail">{SKILL_TEXT[skill].detail}</span>
            </span>
          </label>
        ))}
        <p className="settings-detail">
          Your partner always plays its best. Opponents and difficulty apply from your next game.
        </p>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Pace of play</legend>
        {PACING_OPTIONS.map(({ label, ms }) => (
          <label key={ms} className="settings-choice">
            <input
              type="radio"
              name="pacing"
              checked={settings.pacingMs === ms}
              onChange={() => set({ pacingMs: ms })}
            />
            <span>{label}</span>
          </label>
        ))}
        <p className="settings-detail">Tap the table at any time to hurry the current trick.</p>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Cards</legend>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={settings.oneTapPlay}
            onChange={(e) => set({ oneTapPlay: e.target.checked })}
          />
          <span>
            One-tap play
            <span className="settings-detail">
              Play a card with a single tap, instead of tapping it twice.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Sound</legend>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={settings.soundOn}
            onChange={(e) => set({ soundOn: e.target.checked })}
          />
          <span>
            Sound effects
            <span className="settings-detail">
              Shuffles, cards and the odd sting. Also on the table, beside Menu.
            </span>
          </span>
        </label>
      </fieldset>
    </main>
  );
}
