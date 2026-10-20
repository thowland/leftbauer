import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AudioEngine, browserAudioDeps } from './audio/audioEngine';
import { App } from './ui/App';
import { browserBotRunner } from './ui/game/botRunner';
import { browserStorage } from './ui/browserStorage';
import { parseLaunchOptions } from './ui/launchOptions';
import './styles.css';

const { dev, seed, fast, motion, sound } = parseLaunchOptions(window.location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// No audio engine at all under test, so nothing can reach the speakers.
const audio = sound ? new AudioEngine(browserAudioDeps(window, import.meta.env.BASE_URL)) : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      dev={dev}
      seed={seed}
      fast={fast}
      motion={motion && !reducedMotion}
      audio={audio}
      botRunner={browserBotRunner()}
      storage={browserStorage()}
    />
  </StrictMode>
);
