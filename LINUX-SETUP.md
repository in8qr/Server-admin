# Step-by-step Linux setup (Mjsrvr / Server-admin)

Run these steps **in order** on your Linux server. Replace `youruser` with your actual username if needed.

---

## Step 1: Create app directory and go there

```bash
mkdir -p ~/apps
cd ~/apps
```

*(You can use `~/Mjsrvr` or `/opt/mjsrvr` instead of `~/apps`; if so, use that path in all steps below.)*

---

## Step 2: Install Node.js 18+ and Git (if not already installed)

**Ubuntu / Debian:**

```bash
sudo apt update
sudo apt install -y git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Check versions:**

```bash
node -v
npm -v
git --version
```

*(You should see Node v20.x, npm 10.x, and git.)*

---

## Step 3: Clone the repo

```bash
cd ~/apps
git clone https://github.com/in8qr/Server-admin.git Mjsrvr
cd Mjsrvr
```

---

## Step 4: Install dependencies (root, server, client)

```bash
cd ~/apps/Mjsrvr

npm install

cd server
npm install
cd ..

cd client
npm install
cd ..
```

---

## Step 5: Build the project

```bash
cd ~/apps/Mjsrvr
npm run build
```

*(You should see the client and server build finish without errors.)*

---

## Step 6: Create the `.env` file

**6.1 Copy the example env file:**

```bash
cd ~/apps/Mjsrvr
cp .env.example .env
```

**6.2 Generate a session secret:**

```bash
openssl rand -base64 32
```

*Copy the output (one long line).*

**6.3 Edit `.env`:**

```bash
nano .env
```

**6.4 Put this in the file (paste your secret where it says PASTE_SECRET_HERE):**

```env
PORT=8289
SESSION_SECRET=PASTE_SECRET_HERE
```

**6.5 Save and exit:**  
In nano: `Ctrl+O`, `Enter`, then `Ctrl+X`.

*(Optional: set `DATA_DIR=/var/lib/mjsrvr` if you want data outside the app folder; then create it with `sudo mkdir -p /var/lib/mjsrvr` and `sudo chown youruser:youruser /var/lib/mjsrvr`.)*

---

## Step 7: Create the admin user (one-time)

**7.1 Start the app in the background:**

```bash
cd ~/apps/Mjsrvr
node server/dist/index.js &
```

**7.2 Wait for it to listen:**

```bash
sleep 3
```

**7.3 Create admin (replace `admin` and `YourSecurePassword` with your choice):**

```bash
curl -X POST http://localhost:8289/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourSecurePassword"}'
```

*You should see: `{"ok":true,"message":"Admin user created"}`*

**7.4 Stop the temporary server:**

```bash
kill %1
```

*(Or run `jobs` then `kill %1` if needed.)*

---

## Step 8: Install PM2 and run the app

**8.1 Install PM2 globally:**

```bash
sudo npm install -g pm2
```

**8.2 Start Mjsrvr using the ecosystem config:**

```bash
cd ~/apps/Mjsrvr
pm2 start ecosystem.config.yml
```

**8.3 Save the process list and set startup on boot:**

```bash
pm2 save
pm2 startup
```

*PM2 will print a command like: `sudo env PATH=... pm2 startup systemd -u youruser --hp /home/youruser`*

**8.4 Run that exact command** (copy-paste the line PM2 printed):

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u youruser --hp /home/youruser
```

*(Use your real username and path if different.)*

**8.5 Check status and logs:**

```bash
pm2 status
pm2 logs mjsrvr
```

*(Press `Ctrl+C` to exit logs.)*

---

## Step 9: Open the dashboard

In a browser go to:

**http://YOUR_SERVER_IP:8289**

Log in with the username and password you used in Step 7.3.

---

## Optional: Nginx reverse proxy (domain + Cloudflare)

If you want a domain (e.g. `admin.yourdomain.com`) and/or Cloudflare in front:

**9.1 Install Nginx:**

```bash
sudo apt install -y nginx
```

**9.2 Create the site config:**

```bash
sudo nano /etc/nginx/sites-available/mjsrvr
```

**9.3 Paste this (replace `admin.yourdomain.com` with your domain or use `_` for default):**

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

Save and exit: `Ctrl+O`, `Enter`, `Ctrl+X`.

**9.4 Enable the site and reload Nginx:**

```bash
sudo ln -s /etc/nginx/sites-available/mjsrvr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**9.5 In Cloudflare:**  
Add a DNS record: `admin.yourdomain.com` → A record to your server IP (proxy on if you use Cloudflare). Use Cloudflare SSL (e.g. Flexible) or add a certificate (e.g. Certbot) for Full/Strict.

---

## Optional: YAML / config reference

**PM2 ecosystem (already in repo):** `ecosystem.config.yml`

- Run from repo root: `pm2 start ecosystem.config.yml`
- Uses `.env` from the same directory.

**Useful PM2 commands:**

```bash
pm2 status
pm2 logs mjsrvr
pm2 restart mjsrvr
pm2 stop mjsrvr
pm2 delete mjsrvr
```

---

## Updating the app later

```bash
cd ~/apps/Mjsrvr
git pull origin main
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
npm run build
pm2 restart mjsrvr
```

---

## Checklist

| # | Step | Command / action |
|---|------|-------------------|
| 1 | Directory | `mkdir -p ~/apps && cd ~/apps` |
| 2 | Node + Git | `sudo apt install -y git` then NodeSource + `sudo apt install -y nodejs` |
| 3 | Clone | `git clone https://github.com/in8qr/Server-admin.git Mjsrvr && cd Mjsrvr` |
| 4 | Install deps | `npm install`, then `cd server && npm install`, then `cd ../client && npm install && cd ..` |
| 5 | Build | `npm run build` |
| 6 | .env | `cp .env.example .env`, `openssl rand -base64 32`, then edit `.env` with PORT and SESSION_SECRET |
| 7 | Admin user | Start app with `node server/dist/index.js &`, then curl to `/api/auth/setup`, then `kill %1` |
| 8 | PM2 | `sudo npm install -g pm2`, `pm2 start ecosystem.config.yml`, `pm2 save`, `pm2 startup` |
| 9 | Use | Open http://YOUR_SERVER_IP:8289 and log in |

You’re done.
