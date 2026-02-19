# Push to GitHub and deploy on Linux

## Part 1: Create GitHub repo and push (from Windows)

### 1.1 Create the repository on GitHub

1. Open **https://github.com/new**
2. **Repository name:** `Mjsrvr` (or any name you like)
3. **Description (optional):** e.g. `Linux server admin dashboard`
4. Choose **Private** or **Public**
5. **Do not** check "Add a README" or ".gitignore" (we already have them)
6. Click **Create repository**

### 1.2 Push from your Windows machine

In PowerShell (or Git Bash), from your project folder:

```powershell
cd C:\Users\M\Desktop\Mjsrvr
```

If Git has never been set up on this machine, set your identity once (use your real name and GitHub email):

```powershell
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

Then add, commit, and push:

```powershell
# First commit (repo is already initialized with .gitignore)
git add .
git commit -m "Initial commit: Mjsrvr admin dashboard"

# Add your GitHub repo as remote
git remote add origin https://github.com/in8qr/Server-admin.git

# Push (main branch)
git branch -M main
git push -u origin main
```

If GitHub asks for auth, use a **Personal Access Token** (Settings → Developer settings → Personal access tokens) as the password, or set up **Git Credential Manager** / **SSH keys**.

---

## Part 2: Setup on your Linux machine

### 2.1 Prerequisites on Linux

- **Node.js 18+** and **npm**

  ```bash
  # Ubuntu/Debian
  sudo apt update
  sudo apt install -y nodejs npm

  # Or use NodeSource for a newer Node version
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  ```

  Check:

  ```bash
  node -v   # v18.x or v20.x
  npm -v
  ```

- **Git** (if not installed):

  ```bash
  sudo apt install -y git
  ```

### 2.2 Clone the repo

Pick a directory (e.g. next to AyaEye):

```bash
cd ~
# Or: cd /home/youruser  or  cd ~/apps

git clone https://github.com/in8qr/Server-admin.git Mjsrvr
cd Mjsrvr
```

### 2.3 Install dependencies and build

```bash
cd ~/Mjsrvr

# Root
npm install

# Server
cd server && npm install && cd ..

# Client
cd client && npm install && cd ..

# Build (client + server)
npm run build
```

### 2.4 Environment and secret

```bash
cd ~/Mjsrvr

cp .env.example .env
nano .env   # or vim .env
```

Set at least:

- **SESSION_SECRET** — long random string. Generate one on the server:
  ```bash
  openssl rand -base64 32
  ```
  Put the output in `.env` as:
  ```env
  SESSION_SECRET=paste_the_output_here
  ```
- **PORT** — default is `8289`. Change only if you need another port.
- **DATA_DIR** (optional) — e.g. `/var/lib/mjsrvr` if you want users/apps outside the app folder.

Example `.env`:

```env
PORT=8289
SESSION_SECRET=your_openssl_output_here
# Optional for first-time admin (or use curl below):
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD=your-secure-password
```

Save and exit (in nano: Ctrl+O, Enter, Ctrl+X).

### 2.5 Create the admin user (one-time)

With the app **not running** yet, you can create the admin from the server using curl:

```bash
cd ~/Mjsrvr

# Start the server in the background temporarily
node server/dist/index.js &
SERVER_PID=$!

# Wait a second for it to listen
sleep 2

# Create admin (replace with your desired username and password)
curl -X POST http://localhost:8289/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_SECURE_PASSWORD"}'

# Stop the temporary server
kill $SERVER_PID
```

You should see `{"ok":true,"message":"Admin user created"}`.  
Alternatively, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`, start the app once, run:

```bash
curl -X POST http://localhost:8289/api/auth/setup
```

then remove or change those env vars.

### 2.6 Run with PM2 (recommended)

```bash
cd ~/Mjsrvr

# Start the app (server serves API + frontend)
cd server && pm2 start dist/index.js --name mjsrvr && cd ..

# Make PM2 start mjsrvr on reboot
pm2 save
pm2 startup
# Run the command that pm2 startup prints (usually with sudo)

# Check status
pm2 status
pm2 logs mjsrvr
```

The app will be on **http://YOUR_SERVER_IP:8289** (or http://localhost:8289 if you’re on the server).

### 2.7 Reverse proxy and HTTPS (optional)

To use a domain and HTTPS (e.g. `https://admin.yourdomain.com`) and/or put it behind Cloudflare:

**Nginx** (example):

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/mjsrvr
```

Add (replace `admin.yourdomain.com` and port if needed):

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8289;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/mjsrvr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Then in Cloudflare: add a DNS record for `admin.yourdomain.com` (A or CNAME to your server IP), and use Cloudflare’s proxy (orange cloud) and SSL/TLS as you prefer. For “Flexible” SSL, Nginx can stay on port 80; for “Full” or “Full (strict)”, add a real certificate (e.g. Certbot) and listen on 443.

---

## Quick reference

| Step | Command / action |
|------|-------------------|
| Clone | `git clone https://github.com/in8qr/Server-admin.git Mjsrvr && cd Mjsrvr` |
| Install | `npm install && cd server && npm install && cd .. && cd client && npm install && cd ..` |
| Build | `npm run build` |
| Env | `cp .env.example .env` then set `SESSION_SECRET` (and optionally `PORT`, `DATA_DIR`) |
| Create admin | Start app, then `curl -X POST http://localhost:8289/api/auth/setup -H "Content-Type: application/json" -d '{"username":"admin","password":"YOUR_PASSWORD"}'` |
| Run with PM2 | `cd server && pm2 start dist/index.js --name mjsrvr` then `pm2 save` and `pm2 startup` |

After that, open **http://YOUR_SERVER_IP:8289** (or your domain) and log in with the admin user you created.
