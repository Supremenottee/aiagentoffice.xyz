import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { AGENTS } from './agents.js';
import { validateTaskInput } from './filter.js';
import { createTask, getTask, getAllTasks, processTask } from './orchestrator.js';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // We'll handle CSP on frontend
}));
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Serve static frontend
app.use(express.static(join(__dirname, '..', 'public')));

// Clean URL for docs
app.get('/docs', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'docs.html'));
});

// Clean URL for playground
app.get('/playground', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'playground.html'));
});

// ─── REST API ───

/** Get all agents info */
app.get('/api/agents', (_req, res) => {
  const agents = Object.values(AGENTS).map(a => ({
    id: a.id,
    name: a.name,
    role: a.role,
    avatar: a.avatar,
    color: a.color,
  }));
  res.json({ agents });
});

/** Submit a new task */
app.post('/api/tasks', (req, res) => {
  const { input, walletAddress } = req.body;

  const validation = validateTaskInput(input);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  const task = createTask(validation.sanitized, walletAddress || null);
  res.status(201).json({ taskId: task.id, status: task.status });

  // Process async — emit updates via WebSocket
  processTask(task.id, (event, data) => {
    io.emit(event, data);
  });
});

/** Get task status */
app.get('/api/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

/** Get all tasks (queue) */
app.get('/api/tasks', (_req, res) => {
  res.json({ tasks: getAllTasks() });
});

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    agents: Object.keys(AGENTS).length,
    hasApiKey: !!config.openrouter.apiKey,
  });
});

// ─── WebSocket ───

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  /** Submit task via WebSocket */
  socket.on('task:submit', (data) => {
    const { input, walletAddress } = data || {};

    const validation = validateTaskInput(input);
    if (!validation.valid) {
      socket.emit('task:error', { error: validation.reason });
      return;
    }

    const task = createTask(validation.sanitized, walletAddress || null);
    socket.emit('task:created', { taskId: task.id });

    processTask(task.id, (event, eventData) => {
      io.emit(event, eventData);
    });
  });

  /** Get current queue */
  socket.on('tasks:list', () => {
    socket.emit('tasks:list', { tasks: getAllTasks() });
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ─── Start ───

httpServer.listen(config.port, () => {
  console.log(`\n🏢 AgentOffice server running on port ${config.port}`);
  console.log(`   API: http://localhost:${config.port}/api`);
  console.log(`   WebSocket: ws://localhost:${config.port}`);
  console.log(`   Agents: ${Object.values(AGENTS).map(a => a.name).join(', ')}`);
  console.log(`   LLM: ${config.openrouter.model}`);
  console.log(`   API Key: ${config.openrouter.apiKey ? '✓ configured' : '✗ MISSING'}\n`);
});
