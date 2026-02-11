import { WebSocketServer } from 'ws';

let wss = null;
let clients = new Set();

export function createWebSocketServer(server, port) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/api/activity-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        clients.add(ws);
        
        ws.on('close', () => {
          clients.delete(ws);
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error.message);
          clients.delete(ws);
        });

        // Send initial connection message
        ws.send(JSON.stringify({ type: 'connected', message: 'Connected to activity stream' }));
      });
    } else {
      socket.destroy();
    }
  });

  console.log(`WebSocket server listening on port ${port}/api/activity-stream`);
}

export function broadcastActivity(activity) {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'activity',
    data: activity,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

export function getConnectedClientsCount() {
  return clients.size;
}
