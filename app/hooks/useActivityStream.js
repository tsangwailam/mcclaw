import { useEffect, useState, useCallback, useRef } from 'react';

export function useActivityStream(wsPort = 3102) {
  const [isConnected, setIsConnected] = useState(false);
  const [activities, setActivities] = useState([]);
  const [useWebSocket, setUseWebSocket] = useState(true);
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3; // After 3 failures, switch to polling

  const connectWebSocket = useCallback(() => {
    if (!useWebSocket || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Try to use the same hostname and port as the current page first
      // But if that fails, it will use the explicit wsPort
      const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/api/activity-stream`;
      
      console.log('[useActivityStream] 🔌 Attempting WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      // Set a connection timeout
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.warn('[useActivityStream] ⏱️  WebSocket connection timeout');
          ws.close();
          reconnectAttempts.current++;
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            console.warn('[useActivityStream] Max reconnect attempts reached, falling back to polling');
            setUseWebSocket(false);
          } else {
            setTimeout(connectWebSocket, 3000);
          }
        }
      }, 5000); // 5 second timeout

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        console.log('[useActivityStream] ✅ WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'activity') {
            console.log('[useActivityStream] 🔔 Activity broadcast received:', message.data.id, message.data.action);
            // Update activities list with new activity
            setActivities((prev) => {
              // Remove existing activity with same id and add new one at beginning
              const filtered = prev.filter((a) => a.id !== message.data.id);
              return [message.data, ...filtered];
            });
          }
        } catch (err) {
          console.error('[useActivityStream] Error parsing message:', err);
        }
      };

      ws.onclose = () => {
        clearTimeout(connectTimeout);
        console.warn('[useActivityStream] ⚠️  WebSocket disconnected');
        setIsConnected(false);
        // Try to reconnect every 3 seconds
        if (useWebSocket && reconnectAttempts.current < maxReconnectAttempts) {
          console.log(`[useActivityStream] Reconnect attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts} in 3s...`);
          reconnectAttempts.current++;
          setTimeout(connectWebSocket, 3000);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('[useActivityStream] Switching to polling mode');
          setUseWebSocket(false);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectTimeout);
        console.error('[useActivityStream] ❌ WebSocket error:', error.message || error);
        setIsConnected(false);
        reconnectAttempts.current++;
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('[useActivityStream] WebSocket failed, switching to polling mode');
          setUseWebSocket(false);
        } else {
          console.log(`[useActivityStream] Will retry in 3s (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setTimeout(connectWebSocket, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[useActivityStream] ❌ Connection initialization failed:', error);
      setUseWebSocket(false);
    }
  }, [useWebSocket]);

  useEffect(() => {
    if (useWebSocket) {
      console.log('[useActivityStream] Using WebSocket mode');
      connectWebSocket();
      return () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      };
    } else {
      // In polling mode, the hook just notifies that polling should be used
      // The consuming component (dashboard) will handle polling via its own fetchData()
      console.log('[useActivityStream] Polling mode enabled - consuming component should handle polling');
    }
  }, [useWebSocket, connectWebSocket]);

  return {
    isConnected,
    activities,
    useWebSocket,
    setUseWebSocket,
  };
}
