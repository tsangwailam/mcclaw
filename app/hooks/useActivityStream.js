import { useEffect, useState, useCallback, useRef } from 'react';

export function useActivityStream(wsPort = 3102) {
  const [isConnected, setIsConnected] = useState(false);
  const [activities, setActivities] = useState([]);
  const [useWebSocket, setUseWebSocket] = useState(true);
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const activitiesRef = useRef(new Map()); // Track activities by ID

  const connectWebSocket = useCallback(() => {
    if (!useWebSocket) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/api/activity-stream`;
      
      console.log('[WebSocket] Connecting to', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'activity') {
          console.log('[WebSocket] Activity received:', message.data.id, message.data.action);
          // Update activities list with new activity
          setActivities((prev) => {
            // Remove existing activity with same id and add new one at beginning
            const filtered = prev.filter((a) => a.id !== message.data.id);
            return [message.data, ...filtered];
          });
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected, attempting reconnect in 3s');
        setIsConnected(false);
        // Try to reconnect every 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.warn('[WebSocket] Error:', error);
        setIsConnected(false);
        // Fall back to polling
        setUseWebSocket(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.warn('[WebSocket] Connection failed:', error);
      setUseWebSocket(false);
    }
  }, [useWebSocket, wsPort]);

  const pollActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/activity?limit=50');
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, []);

  useEffect(() => {
    if (useWebSocket) {
      connectWebSocket();
      return () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      };
    } else {
      // Fall back to polling if WebSocket is disabled
      pollActivities();
      const interval = setInterval(pollActivities, 10000);
      pollIntervalRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [useWebSocket, connectWebSocket, pollActivities]);

  return {
    isConnected,
    activities,
    useWebSocket,
    setUseWebSocket,
  };
}
