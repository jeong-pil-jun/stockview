import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startAlertWatcher } from './store/app';
import './styles.css';

startAlertWatcher();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
