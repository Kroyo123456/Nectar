import "./mock/tauriMock";
import React from 'react';
import ReactDOM from 'react-dom/client';
import Dock from './Dock';
import './Dock.css';
import { DynamicThemeProvider } from './context/DynamicThemeContext';

document.addEventListener('contextmenu', (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DynamicThemeProvider>
      <Dock />
    </DynamicThemeProvider>
  </React.StrictMode>,
);
