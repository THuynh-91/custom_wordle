import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { apiFetch } from './lib/apiClient';

// Function to check if backend is ready
async function checkBackendHealth(): Promise<boolean> {
  const maxAttempts = 30;
  const retryDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await apiFetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Backend not ready yet, will retry
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }

  // If we've exhausted all attempts, proceed anyway
  console.warn('Backend health check timed out, proceeding anyway');
  return false;
}

// Hide the loading screen
function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    // Remove from DOM after transition
    setTimeout(() => {
      loadingScreen.remove();
    }, 500);
  }
}

// Initialize app after backend is ready
async function initializeApp() {
  await checkBackendHealth();
  hideLoadingScreen();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

initializeApp();
