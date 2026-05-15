# FieldLog — Deployment Guide
## PocketBase (Fly.io) + Vercel Frontend

---

## Overview

| What | Service | Cost |
|------|---------|------|
| Frontend (React app) | Vercel | Free |
| Database + REST API | PocketBase on Fly.io | Free (shared-cpu-1x, 256MB RAM, 1GB volume) |

No Base44. No auth server. Shared team password enforced on the frontend.

---

## Part 1 — Deploy PocketBase to Fly.io

### 1.1 Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth signup   # or fly auth login
```

### 1.2 Create project directory

```bash
mkdir fieldlog-pb && cd fieldlog-pb
```

### 1.3 Create Dockerfile

```dockerfile
FROM alpine:latest

ARG PB_VERSION=0.22.20

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

EXPOSE 8080
VOLUME /pb/pb_data

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
```

### 1.4 Create fly.toml

```toml
app = "fieldlog-pb"   # Change this to a unique name
primary_region = "dfw"  # Dallas — closest to Houston

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1

[mounts]
  source = "pb_data"
  destination = "/pb/pb_data"
```

> **Note on `auto_stop_machines`:** With `min_machines_running = 0`, Fly will
> spin the machine down when idle and back up on first request (~2s cold start).
> This keeps it free. If cold start is unacceptable, set `min_machines_running = 1`
> (still free tier as long as you stay under the monthly compute allowance).

### 1.5 Launch and deploy

```bash
fly launch --no-deploy   # accept defaults, say YES to creating a volume
fly volumes create pb_data --region dfw --size 1
fly deploy
```

Your PocketBase URL will be: `https://fieldlog-pb.fly.dev`

### 1.6 Set up PocketBase admin account

1. Open `https://fieldlog-pb.fly.dev/_/` in your browser
2. Create your admin email + password (you only do this once — it locks the setup screen)
3. Go to **Collections** → **Import Collections**
4. Open `pocketbase-schema.txt` from this repo, copy the JSON block (inside the `-- [ ... ]` comment), paste it, and click Import
5. For each collection, go to **API Rules** and set all four rules (List, View, Create, Update, Delete) to empty string `""` — this opens the API to the app (the password gate handles access control)

---

## Part 2 — Deploy Frontend to Vercel

### 2.1 Push to GitHub

```bash
cd /path/to/fieldlog-migrated
git init
git add .
git commit -m "Initial commit — Base44 removed, PocketBase adapter"
git remote add origin https://github.com/YOUR_USERNAME/fieldlog.git
git push -u origin main
```

### 2.2 Create Vercel project

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Framework preset: **Vite** (auto-detected)
4. Root directory: leave as-is (`.`)
5. Build command: `npm run build`
6. Output directory: `dist`

### 2.3 Set environment variables in Vercel

In the Vercel project settings → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `VITE_PB_URL` | `https://fieldlog-pb.fly.dev` |
| `VITE_APP_PASSWORD` | `your-team-password-here` |

> **Important:** Vercel injects `VITE_*` env vars at build time, not runtime.
> Any time you change `VITE_APP_PASSWORD`, you must redeploy.
> To change the password without a code push: go to Vercel → Deployments → Redeploy.

### 2.4 Deploy

Click **Deploy**. First deploy takes ~60 seconds. After that, every `git push` to `main` triggers an automatic redeploy.

Your app URL: `https://fieldlog.vercel.app` (or a custom domain if you add one)

---

## Part 3 — Local Development

```bash
cd fieldlog-migrated
cp .env.local.example .env.local
# Edit .env.local:
#   VITE_PB_URL=https://fieldlog-pb.fly.dev   (or http://localhost:8090 if running PB locally)
#   VITE_APP_PASSWORD=your-dev-password

npm install
npm run dev
```

To run PocketBase locally (optional — useful for offline dev):

```bash
# Download pocketbase binary for your OS from https://pocketbase.io/docs/
./pocketbase serve
# Admin UI at http://localhost:8090/_/
```

---

## Part 4 — Ongoing Operations

### Changing the team password
Update `VITE_APP_PASSWORD` in Vercel env vars → Redeploy.

### Backing up data
PocketBase stores everything in a single SQLite file.
```bash
fly ssh console -a fieldlog-pb
# Inside the container:
cp /pb/pb_data/data.db /pb/pb_data/data.db.bak
```
Or use `fly sftp` to pull the file down locally.

### Updating PocketBase version
Change `PB_VERSION` in the Dockerfile and redeploy: `fly deploy`

### Checking logs
```bash
fly logs -a fieldlog-pb
```

---

## Part 5 — Files Changed from Original Base44 Project

| File | Change |
|------|--------|
| `src/api/pocketbaseClient.js` | **NEW** — replaces `base44Client.js` |
| `src/lib/PasswordGate.jsx` | **NEW** — replaces `AuthContext.jsx` |
| `src/pages/Settings.jsx` | **NEW** — replaces `Profile.jsx` |
| `src/App.jsx` | Removed AuthProvider, added PasswordGate + Settings route |
| `src/components/layout/AppLayout.jsx` | Profile → Settings nav link |
| `src/pages/DailyLogDetail.jsx` | Removed `base44.auth.me()` — uses `getSettings()` |
| `src/pages/PunchList.jsx` | Removed `base44.auth.me()` — uses `getSettings()` |
| `src/lib/PageNotFound.jsx` | Removed auth dependency |
| `package.json` | Removed `@base44/sdk` and `@base44/vite-plugin` |
| `vite.config.js` | Removed Base44 vite plugin |
| `.env.local.example` | New env vars: `VITE_PB_URL`, `VITE_APP_PASSWORD` |
| `pocketbase-schema.txt` | **NEW** — collection definitions for PocketBase import |

Files left untouched (all pages, all components, PDF export, shadcn UI):
Everything else is identical to the original.
