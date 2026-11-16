// src/main.jsx — Application entry point
// Injects ThemeProvider, ToastProvider, and ProfileProvider contexts

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { InstallPromptProvider } from './contexts/InstallPromptContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ProfileProvider>
          <InstallPromptProvider>
            <App />
          </InstallPromptProvider>
        </ProfileProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
