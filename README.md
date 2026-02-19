# Mjsrvr — Linux server admin dashboard

A small admin module for your Linux server: dashboard with **live CPU, RAM, temperature, uptime** and a **saved app links** launcher. Protected by username/password (suitable for putting behind Cloudflare).

## Features

- **Login** with username/password (session cookie)
- **Live metrics** (polling every ~2.5s): CPU %, RAM %, temperature (if `lm-sensors` is available), uptime, hostname, load average
- **App links**: add URLs with name and category; open in same or new tab
- Data stored in JSON files (no database required)

## Tech stack

- **Backend**: Node.js, Express, TypeScript, cookie-session, bcrypt
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Storage**: JSON files in `server/data/` (or `DATA_DIR`)

## Quick start

### 1. Install and build

```bash
cd Mjsrvr
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
npm run build
```

### 2. Create first admin user

With no users yet, call the setup endpoint once (from the server or locally):

```bash
# Option A: env vars (recommended for production)
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your-secure-password
curl -X POST http://localhost:8289/api/auth/setup

# Option B: request body
curl -X POST http://localhost:8289/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-secure-password"}'
```

After that, log in at `http://localhost:8289` (or your deployed URL).

### 3. Run

**Development** (API on 8289, Vite dev server on 5173 with proxy to API):

```bash
npm run dev
```

**Production** (single server serves API + built frontend):

```bash
npm run build
npm start
```

Then open `http://localhost:8289`. Set `PORT` in `.env` if you want a different port.

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `8289`) |
| `SESSION_SECRET` | Secret for session cookies (use `openssl rand -base64 32`) |
| `DATA_DIR` | Optional path for `users.json` and `apps.json` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Used only for one-time `/api/auth/setup` |

## Deploy on Linux (e.g. same server as AyaEye)

1. Clone/build on the server and set `.env` (including a strong `SESSION_SECRET`).
2. Run setup once to create the admin user, then use the dashboard to add your app URLs.
3. Run behind your reverse proxy (e.g. Nginx or Caddy) and put it behind Cloudflare as you prefer. Use HTTPS in production so the session cookie can be `secure`.
4. Optional: run with PM2:

   ```bash
   cd /path/to/Mjsrvr && npm run build && cd server && pm2 start dist/index.js --name mjsrvr
   pm2 save
   ```

## Temperature

If `lm-sensors` is installed and configured (`sensors`), the dashboard shows the first temperature sensor found. Otherwise it shows **N/A**. No sensors are required for the rest of the dashboard.

## API (all under `/api`)

- `POST /api/auth/login` — body: `{ "username", "password" }`
- `POST /api/auth/logout`
- `GET /api/auth/me` — current user
- `POST /api/auth/setup` — one-time admin creation (when no users exist)
- `GET /api/apps` — list links (auth required)
- `POST /api/apps` — create link (auth required)
- `PUT /api/apps/:id` — update link (auth required)
- `DELETE /api/apps/:id` — delete link (auth required)
- `GET /api/system` — system metrics (auth required)
