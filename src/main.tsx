import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { browserStorage } from './ui/browserStorage';
import { parseLaunchOptions } from './ui/launchOptions';
import './styles.css';

const { dev, seed, fast } = parseLaunchOptions(window.location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dev={dev} seed={seed} fast={fast} storage={browserStorage()} />
  </StrictMode>
);
