# Hawkeye — Automated Billet Vision Inspection System

Hawkeye is an industrial-grade automated vision inspection monitoring platform engineered for continuous steel billet casting and rolling manufacturing lines. 

The application provides real-time vision overlays with animated roller conveyor simulations, live billet dimensional measurements, instant defect alert triage (`PASS`, `FAIL`, `REWORK`, `REVIEW`), analytics with stacked yield trends and categorical defect donuts, and structured inspection history logs with Excel (`.xlsx`) export capabilities.

---

## 🏗 Architecture & Workspace Structure

The project is structured as a `pnpm` monorepo:

```text
Hawkeye/
├── apps/
│   ├── web/                    # React + Vite + TypeScript frontend dashboard
│   │   ├── src/
│   │   │   ├── components/     # App shell, headers, and UI primitives
│   │   │   ├── features/       # Product domains: live-inspection, alerts, analytics, inspection-log
│   │   │   ├── lib/            # Real-time simulation engine, formatting, tolerance rules
│   │   │   └── styles/         # CSS tokens (ui-context.md) & self-hosted IBM Plex typography
│   │   └── package.json
│   └── api/                    # Express + WebSocket real-time network server
│       ├── src/
│       │   ├── controllers/    # Request handlers
│       │   ├── realtime/       # WebSocket server & event broadcasting (/ws)
│       │   ├── routes/         # REST API route definitions (/api/v1)
│       │   ├── services/       # Inspection state management & event generator
│       │   └── server.ts       # Network server entry point (0.0.0.0:8000)
│       └── package.json
├── packages/
│   └── shared/                 # Zod schemas, TypeScript types, and domain constants
│       ├── src/index.ts
│       └── package.json
├── assets/                     # UI reference mockups and media assets
├── context/                    # Architecture, design guidelines, and code standards
├── .gitignore
├── pnpm-workspace.yaml
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v20+ or v22+
- **pnpm**: v9+ or v12+ (`npm install -g pnpm`)

### Installation
From the repository root:
```bash
pnpm install
```

---

## 💻 Running the Application

### 1. Run Everything (Web Dashboard + Network API Server)
Runs both the frontend dashboard and the backend server concurrently:
```bash
pnpm dev
```

### 2. Run Only the Web Dashboard (Exposed on LAN)
```bash
pnpm dev:web
```
- **Local URL**: [http://localhost:3000/](http://localhost:3000/)
- **Network URL (LAN)**: `http://<YOUR_LOCAL_IP>:3000/` (accessible from tablets, operator screens, and phones on the same WiFi/Ethernet network)

### 3. Run Only the Network API & WebSocket Server
```bash
pnpm dev:api
```
- **Local API Health**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Network API Health**: `http://<YOUR_LOCAL_IP>:8000/api/v1/health`
- **WebSocket Feed**: `ws://<YOUR_LOCAL_IP>:8000/ws`

---

## 📡 API & WebSocket Reference

Base path: `/api/v1`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Network status and service heartbeat |
| `GET` | `/api/v1/inspections` | Paginated list of inspection records (`?limit=50&offset=0`) |
| `GET` | `/api/v1/inspections/current` | Most recently inspected billet details |
| `GET` | `/api/v1/alerts` | Active defect alerts (`FAIL`, `REWORK`, `REVIEW`) |
| `POST` | `/api/v1/inspections/ingest` | Ingest ML vision event payload |
| `WS` | `/ws` | Live inspection event stream broadcast |

---

## 🎨 Design & Inspection Standards

- **Strict UI Specification**: Fully adheres to `context/ui-context.md` design tokens, 4px grid spacing, and card layouts.
- **Color Discipline**: Color is reserved exclusively for statuses (`Pass` = green, `Fail` = red, `Rework` = amber, `Review` = blue). Defect distributions use a distinct categorical palette.
- **Air-Gapped Plant Network Ready**: Self-hosted `IBM Plex Sans` and `IBM Plex Mono` fonts with tabular numbers (`tabular-nums`) to prevent metric jittering during live stream updates.
- **Real-Time Video Canvas**: 16:9 locked aspect ratio, 0-radius bounding boxes, status overlay chips, and roller table animations.
- **Structured Export**: Direct client-side generation and download of formatted Excel files (`.xlsx`) matching active filters.
