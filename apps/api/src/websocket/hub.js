/**
 * WebSocket & Real-Time Event Hub
 * Broadcasts telemetry, alerts and simulator states to connected PWA clients.
 */

const { WebSocketServer, WebSocket } = require('ws');

class EventHub {
  constructor() {
    this.wss = null;
    this.sseClients = new Set();
  }

  init(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      // Send initial welcome
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (e) {}
      });

      ws.on('error', () => {});
    });

    console.log('⚡ WebSocket Server initialized on path /ws');
  }

  // Register SSE (Server-Sent Events) HTTP response stream
  addSseClient(res) {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Broadcast payload to all connected WebSocket and SSE clients
   */
  broadcast(eventType, payload) {
    const message = JSON.stringify({
      type: eventType,
      data: payload,
      timestamp: new Date().toISOString()
    });

    // 1. WebSocket broadcast
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(message);
          } catch (err) {}
        }
      });
    }

    // 2. SSE broadcast
    if (this.sseClients.size > 0) {
      const sseData = `event: ${eventType}\ndata: ${message}\n\n`;
      this.sseClients.forEach((client) => {
        try {
          client.write(sseData);
        } catch (err) {
          this.sseClients.delete(client);
        }
      });
    }
  }
}

module.exports = new EventHub();
