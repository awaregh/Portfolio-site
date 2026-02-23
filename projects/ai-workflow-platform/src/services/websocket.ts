import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { getConfig } from '../lib/config';
import { getLogger } from '../lib/logger';
import { JwtPayload, WsEvent } from '../types';

const logger = getLogger().child({ module: 'websocket' });

interface ClientConnection {
  ws: WebSocket;
  tenantId: string;
  userId: string;
  subscribedRuns: Set<string>;
  isAlive: boolean;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Attach WebSocket server to existing HTTP server.
   */
  attach(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat to detect stale connections
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, id) => {
        if (!client.isAlive) {
          logger.debug({ clientId: id }, 'Terminating stale WebSocket connection');
          client.ws.terminate();
          this.clients.delete(id);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30_000);

    this.wss.on('close', () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    });

    logger.info('WebSocket server attached');
  }

  /**
   * Handle new WebSocket connection with JWT auth.
   */
  private handleConnection(ws: WebSocket, req: import('http').IncomingMessage): void {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      const config = getConfig();
      const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const clientId = `${payload.userId}:${Date.now()}`;

      const client: ClientConnection = {
        ws,
        tenantId: payload.tenantId,
        userId: payload.userId,
        subscribedRuns: new Set(),
        isAlive: true,
      };

      this.clients.set(clientId, client);

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (data) => {
        this.handleMessage(clientId, data.toString());
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.debug({ clientId }, 'WebSocket client disconnected');
      });

      ws.on('error', (err) => {
        logger.error({ clientId, err }, 'WebSocket client error');
        this.clients.delete(clientId);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        data: { clientId, tenantId: payload.tenantId },
      }));

      logger.info({ clientId, tenantId: payload.tenantId }, 'WebSocket client connected');
    } catch (err) {
      logger.warn({ err }, 'WebSocket auth failed');
      ws.close(4001, 'Invalid token');
    }
  }

  /**
   * Handle client messages (subscribe/unsubscribe to runs).
   */
  private handleMessage(clientId: string, raw: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(raw);

      switch (message.type) {
        case 'subscribe': {
          const runId = message.runId;
          if (runId && typeof runId === 'string') {
            client.subscribedRuns.add(runId);
            client.ws.send(JSON.stringify({ type: 'subscribed', runId }));
            logger.debug({ clientId, runId }, 'Client subscribed to run');
          }
          break;
        }
        case 'unsubscribe': {
          const runId = message.runId;
          if (runId) {
            client.subscribedRuns.delete(runId);
            client.ws.send(JSON.stringify({ type: 'unsubscribed', runId }));
          }
          break;
        }
        case 'ping': {
          client.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        }
        default:
          logger.debug({ clientId, type: message.type }, 'Unknown WebSocket message type');
      }
    } catch {
      logger.warn({ clientId }, 'Invalid WebSocket message format');
    }
  }

  /**
   * Broadcast an event to all clients subscribed to a run.
   */
  broadcast(runId: string, event: WsEvent): void {
    const payload = JSON.stringify(event);
    let sent = 0;

    this.clients.forEach((client) => {
      if (
        client.subscribedRuns.has(runId) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(payload);
        sent++;
      }
    });

    if (sent > 0) {
      logger.debug({ runId, type: event.type, recipients: sent }, 'Broadcast event');
    }
  }

  /**
   * Broadcast to all clients of a specific tenant.
   */
  broadcastToTenant(tenantId: string, event: WsEvent): void {
    const payload = JSON.stringify(event);

    this.clients.forEach((client) => {
      if (
        client.tenantId === tenantId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(payload);
      }
    });
  }

  /**
   * Get count of connected clients.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Gracefully close all connections.
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close(1001, 'Server shutting down');
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    logger.info('WebSocket server closed');
  }
}

// Singleton
export const wsService = new WebSocketService();
