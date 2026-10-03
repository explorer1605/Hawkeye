import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { InspectionEvent } from '@hawkeye/shared';
import { inspectionService } from '../services/inspection-service.js';

export class RealtimeManager {
  private wss: WebSocketServer | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  public initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      // Send the current inspection immediately upon connect
      const current = inspectionService.getCurrent();
      if (current && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'CURRENT_INSPECTION', data: current }));
      }

      ws.on('message', (msg) => {
        try {
          const parsed = JSON.parse(msg.toString());
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
          }
        } catch {
          // ignore
        }
      });
    });

    // Start background stream simulation broadcasting every 5 seconds
    this.startBroadcastLoop();
  }

  public broadcast(type: string, data: unknown) {
    if (!this.wss) return;
    const payload = JSON.stringify({ type, data });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  private startBroadcastLoop() {
    this.intervalTimer = setInterval(() => {
      const event: InspectionEvent = inspectionService.generateRandomEvent();
      this.broadcast('NEW_INSPECTION', event);
    }, 5000);
  }

  public close() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.wss) this.wss.close();
  }
}

export const realtimeManager = new RealtimeManager();
