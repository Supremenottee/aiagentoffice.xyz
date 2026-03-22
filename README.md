<p align="center">
  <img src="design/AgentOffice logo png.png" width="120" alt="AgentOffice">
</p>

<h1 align="center">AgentOffice</h1>

<p align="center">
  <strong>A virtual AI office where 6 autonomous agents collaborate to solve your tasks in real time.</strong>
</p>

<p align="center">
  <a href="https://aiagentoffice.xyz">Live Demo</a> · 
  <a href="https://aiagentoffice.xyz/docs">Documentation</a> · 
  <a href="https://aiagentoffice.xyz/playground">Playground</a>
</p>

---

## What is this?

AgentOffice is a multi-agent simulation where each AI agent has its own role, personality, and communication style. Submit a task and watch 6 agents — CEO, PM, Analyst, Tech Lead, Developer, and QA — debate, delegate, and deliver results through an 8-step pipeline.

The office is rendered as a pixel-art environment where agents walk around, sit at desks, grab coffee, attend meetings, and use the copier — all driven by a deterministic simulation engine.

<p align="center">
  <img src="design/AgentOffice logo png.png" width="600" alt="AgentOffice Screenshot">
</p>

## The Team

| Agent | Name | Role | Personality |
|-------|------|------|-------------|
| 🔴 CEO | Jack | Strategy & Approval | Decisive, big-picture thinker |
| 🟣 PM | Olivia | Coordination | Organized, diplomatic |
| 🔵 Analyst | Ethan | Requirements & Specs | Thorough, analytical |
| 🟢 Tech Lead | Marcus | Architecture & Review | Experienced, perfectionist |
| 🟡 Developer | Riley | Implementation | Energetic, passionate |
| 🟤 QA | Sophie | Testing | Meticulous, finds bugs everywhere |

## Pipeline

```
User Input → CEO → PM → Analyst → Tech Lead → Developer → QA → Tech Lead (review) → CEO (approval)
```

Each step is a real LLM call via OpenRouter. Agents receive the full conversation history and respond in character. ~10 seconds per agent, ~80 seconds total.

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** Vanilla JS, Canvas 2D (pixel art office)
- **AI:** OpenRouter API (GPT-3.5-turbo)
- **Wallet:** Konnekt (EVM + Solana)
- **Shader:** Three.js (aurora background on landing page)

## Quick Start

```bash
# Clone
git clone https://github.com/your-repo/agent-office.git
cd agent-office

# Configure
cp .env.example .env
# Add your OPENROUTER_API_KEY to .env

# Install & run
npm install
npm run dev
```

Open `http://localhost:3001`

## Project Structure

```
├── server/
│   ├── index.js          # Express + Socket.IO server
│   ├── agents.js         # Agent definitions & system prompts
│   ├── orchestrator.js   # Task pipeline engine
│   ├── llm.js            # OpenRouter API wrapper
│   ├── filter.js         # Input validation & XSS protection
│   └── config.js         # Environment config
├── public/
│   ├── index.html        # Landing page
│   ├── playground.html   # Office simulation + task UI
│   ├── docs.html         # Technical documentation
│   ├── css/style.css     # Styles
│   ├── js/
│   │   ├── office-renderer.js  # Pixel art office engine
│   │   ├── app.js              # WebSocket client & UI
│   │   ├── shader-bg.js        # Three.js aurora shader
│   │   ├── wallet.js           # Konnekt wallet bundle
│   │   └── animations.js       # Scroll reveal
│   └── assets/           # Sprites & furniture
└── src/
    ├── shader-bg.js      # Shader source
    └── wallet-app.jsx    # Wallet React component
```

## Features

- **Real AI collaboration** — each agent is a separate LLM call with unique system prompt
- **Pixel art office** — agents walk, sit, work, get coffee in a grid-based simulation
- **A* pathfinding** — agents navigate around furniture and walls
- **Deterministic simulation** — same behavior across page refreshes
- **Real-time updates** — Socket.IO streams every agent response live
- **Wallet gating** — connect MetaMask/Phantom to submit tasks
- **Input protection** — blocks prompt injection, code injection, XSS
- **Persistent queue** — task history saved in localStorage

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | required |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `production` |
| `MAX_TASK_LENGTH` | Max input chars | `2000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |
| `RATE_LIMIT_MAX` | Max requests/window | `20` |
| `CORS_ORIGIN` | Allowed origin | `*` |

## Deploy

```bash
# Upload to server
rsync -avz --exclude node_modules --exclude .git ./ root@your-server:/var/www/agentoffice/

# On server
cd /var/www/agentoffice
npm install --production
pm2 start server/index.js --name agentoffice
pm2 save

# Nginx reverse proxy
cp deploy/nginx.conf /etc/nginx/sites-available/yourdomain.xyz
ln -sf /etc/nginx/sites-available/yourdomain.xyz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d yourdomain.xyz
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/agents` | List all agents |
| `POST` | `/api/tasks` | Submit a task |
| `GET` | `/api/tasks/:id` | Get task status |
| `GET` | `/api/tasks` | List all tasks |
| `GET` | `/api/health` | Health check |

WebSocket events: `task:submit`, `task:created`, `task:agent_start`, `task:agent_response`, `task:completed`, `task:failed`

## License

MIT
