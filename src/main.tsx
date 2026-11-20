import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installAuthenticatedFetch } from './lib/authenticatedFetch';
import './index.css';

// Todas as chamadas a /api passam a levar o JWT da sessão Supabase
installAuthenticatedFetch();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary moduleName="aplicação">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
