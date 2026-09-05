import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './page';
import { registerPublicOfflineWorker } from './pwa';
import './globals.css';
import './mobile-polish.css';
import './station-theme.css';
import './app-navigation.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
registerPublicOfflineWorker();
