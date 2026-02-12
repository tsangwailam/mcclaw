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
      const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}/api/activity-stream`;
      const ws = new WebSocket(wsUrl);

      // Set a connection timeout
      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reconnectAttempts.current++;
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            setUseWebSocket(false);
          } else {
            setTimeout(connectWebSocket, 3000);
          }
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'activity') {
            setActivities((prev) => {
              const filtered = prev.filter((a) => a.id !== message.data.id);
              return [message.data, ...filtered];
            });
          }
        } catch (err) {
          // message parse error
        }
      };

      ws.onclose = () => {
        clearTimeout(connectTimeout);
        setIsConnected(false);
        if (useWebSocket && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(connectWebSocket, 3000);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setUseWebSocket(false);
        }
      };

      ws.onerror = () => {
        clearTimeout(connectTimeout);
        setIsConnected(false);
        reconnectAttempts.current++;

        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setUseWebSocket(false);
        } else {
          setTimeout(connectWebSocket, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setUseWebSocket(false);
    }
  }, [useWebSocket]);

  useEffect(() => {
    if (useWebSocket) {
      connectWebSocket();
      return () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      };
    }
  }, [useWebSocket, connectWebSocket]);

  return {
    isConnected,
    activities,
    useWebSocket,
    setUseWebSocket,
  };
}
