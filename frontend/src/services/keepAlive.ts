/**
 * Keep-alive service to prevent Render backend from sleeping
 * Pings the backend health endpoint every 10 minutes
 */

import { API_BASE_URL } from '../lib/apiClient';

const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const HEALTH_ENDPOINT = '/health';

let pingIntervalId: NodeJS.Timeout | null = null;

/**
 * Pings the backend health endpoint to keep it alive
 */
async function pingBackend(): Promise<void> {
  try {
    const url = API_BASE_URL
      ? `${API_BASE_URL}${HEALTH_ENDPOINT}`
      : HEALTH_ENDPOINT;

    const response = await fetch(url, {
      method: 'GET',
      // Use no-cors to avoid CORS issues, we don't need the response
      cache: 'no-store',
    });

    if (response.ok) {
      console.log('[Keep-Alive] Backend ping successful:', new Date().toISOString());
    } else {
      console.warn('[Keep-Alive] Backend ping returned non-OK status:', response.status);
    }
  } catch (error) {
    // Silent fail - we don't want to spam the console if the backend is temporarily down
    console.debug('[Keep-Alive] Backend ping failed:', error);
  }
}

/**
 * Starts the keep-alive service
 * This will ping the backend every 10 minutes to prevent it from sleeping
 */
export function startKeepAlive(): void {
  // Don't start if already running
  if (pingIntervalId) {
    console.log('[Keep-Alive] Service already running');
    return;
  }

  // Only start keep-alive if we have a backend URL configured
  if (!API_BASE_URL) {
    console.log('[Keep-Alive] No backend URL configured, service not started');
    return;
  }

  console.log('[Keep-Alive] Starting service - will ping every 10 minutes');

  // Ping immediately on start
  pingBackend();

  // Set up interval for future pings
  pingIntervalId = setInterval(pingBackend, PING_INTERVAL);
}

/**
 * Stops the keep-alive service
 */
export function stopKeepAlive(): void {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
    console.log('[Keep-Alive] Service stopped');
  }
}

/**
 * Checks if the keep-alive service is running
 */
export function isKeepAliveRunning(): boolean {
  return pingIntervalId !== null;
}
