import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErroDeTela from './components/ErroDeTela';
import './index.css';
import { instalarApiGuard } from './utils/apiGuard';

instalarApiGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErroDeTela><App /></ErroDeTela>
  </StrictMode>
);
