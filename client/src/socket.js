import { io } from 'socket.io-client';

/**
 * ⚡ Centralized Socket.IO Client Singleton for TripPilot Real-Time Engine.
 * Connects to the backend HTTP/WebSocket server with credentials and auto-reconnection.
 */

// Dynamically resolve backend socket URL from environment or fallback to http://localhost:5000
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/api(\/v1)?\/?$/, '');
  }
  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

// Temporary connection debugging logs
socket.on('connect', () => {
  console.log('[Socket.IO] Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket.IO] Disconnected:', reason);
});
