import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { apiRouter } from './routes/api-routes.js';
import { realtimeManager } from './realtime/websocket-server.js';

const app = express();

app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());

// Versioned API routes
app.use('/api/v1', apiRouter);

const server = http.createServer(app);

// Initialize real-time WebSocket server
realtimeManager.initialize(server);

server.listen(config.PORT, config.HOST, () => {
  console.log(`Hawkeye Network API & WebSocket server running:`);
  console.log(`➜ Local:   http://localhost:${config.PORT}/api/v1/health`);
  console.log(`➜ Network: http://${config.HOST}:${config.PORT}/api/v1/health`);
  console.log(`➜ WS:      ws://localhost:${config.PORT}/ws`);
});

process.on('SIGTERM', () => {
  realtimeManager.close();
  server.close(() => {
    process.exit(0);
  });
});
