import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './i18n.js';

async function initCapacitor() {
  // Only runs in native Android/iOS — silently skipped on web/Vercel
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: 'DARK' });
    await StatusBar.setBackgroundColor({ color: '#009688' });
  } catch {}

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {}

  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    });
  } catch {}
}

initCapacitor().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
