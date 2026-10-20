import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AudioEngine, browserAudioDeps } from './audio/audioEngine';
import { App } from './ui/App';
import { browserStorage } from './ui/browserStorage';
import { parseLaunchOptions } from './ui/launchOptions';
import './styles.css';

const { dev, seed, fast, motion } = parseLaunchOptions(window.location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const audio = new AudioEngine(browserAudioDeps(window, import.meta.env.BASE_URL));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      dev={dev}
      seed={seed}
      fast={fast}
      motion={motion && !reducedMotion}
      audio={audio}
      storage={browserStorage()}
    />
  </StrictMode>
);
