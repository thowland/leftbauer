import { createContext } from 'react';
import type { DeckVariant } from '../assets/manifest';

/** The deck every card is drawn from: two-color or four-color suits (VP-3). */
export const DeckContext = createContext<DeckVariant>('standard');
