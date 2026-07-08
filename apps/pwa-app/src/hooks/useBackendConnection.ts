import { useState, useEffect } from 'react';

/**
 * Custom React Hook to track connectivity to the local backend server.
 * Uses an adaptive polling state machine to conserve tablet battery life:
 * - Polls every 5 seconds when the user is actively using the tablet.
 * - Shuts down polling completely after 5 minutes of user inactivity.
 * - Automatically resumes polling immediately upon user activity (clicks, keys, touch, scroll, focus).
 */
export const useBackendConnection = (): boolean => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
    
    let syncIntervalId: any;
    let inactivityTimeoutId: any;
    let isActive = false; // Starts as false to allow resetInactivityTimer to trigger activation log/pings on mount
    let isComponentMounted = true;

    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const pingTimeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout for local networks

        const res = await fetch(backendUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-store',
          headers: {
            'Accept': 'application/json, text/plain, */*'
          },
          signal: controller.signal
        });
        clearTimeout(pingTimeout);

        if (res.ok || res.status === 200) {
          if (isComponentMounted) {
            setIsOnline(true);
          }
        } else {
          if (isComponentMounted) {
            setIsOnline(false);
          }
        }
      } catch (err) {
        if (isComponentMounted) {
          setIsOnline(false);
        }
      }
    };

    const stopPolling = () => {
      if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
      }
    };

    const startPolling = () => {
      if (!syncIntervalId) {
        syncIntervalId = setInterval(checkBackend, 5000); // Poll every 5s during active use
      }
    };

    const setInactive = () => {
      isActive = false;
      console.log('[Connection Polling] Device inactive for 5 mins. Stopped polling interval.');
      stopPolling();
    };

    const resetInactivityTimer = () => {
      // Clear previous inactivity timeout
      clearTimeout(inactivityTimeoutId);
      
      // Start 5 minutes inactivity timer
      inactivityTimeoutId = setTimeout(setInactive, 5 * 60 * 1000);

      if (!isActive) {
        isActive = true;
        console.log('[Connection Polling] User activity detected. Started 5s interval.');
        checkBackend(); // Trigger immediate check
        startPolling();
      }
    };

    // Initialize active state on mount
    resetInactivityTimer();

    // Listen to user activity (clicks, keystrokes, touches, scrolls, window focus)
    const handleUserActivity = (e: Event) => {
      console.log(`[Connection Polling] Activity reset triggered by event: ${e.type}`);
      resetInactivityTimer();
    };

    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('focus', handleUserActivity);

    return () => {
      isComponentMounted = false;
      clearInterval(syncIntervalId);
      clearTimeout(inactivityTimeoutId);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('focus', handleUserActivity);
    };
  }, []);

  return isOnline;
};
