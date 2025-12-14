# 🚀 Tryhardly Deployment Guide

## Important Notice

**GoDaddy Limitation**: GoDaddy shared hosting does NOT support Node.js applications like Tryhardly. You need:
- GoDaddy VPS (Virtual Private Server)
- OR use recommended platforms below

## ✅ Recommended Deployment (Free/Paid)

### Option 1: Vercel (Frontend) + Railway (Backend) - RECOMMENDED

**Best for**: Production deployment with modern stack

#### Frontend on Vercel (FREE)

1. **Sign up**: https://vercel.com
2. **Import GitHub repo**:
   - Click "New Project"
   - Select `gregormortis/tryhardly`
   - Root Directory: `frontend`
3. **Configure**:
   - Framework: Next.js (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=your-backend-url
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key
   ```
5. **Deploy**: Click Deploy

#### Backend on Railway (FREE $5/month credit)

1. **Sign up**: https://railway.app
2. **New Project** > **Deploy from GitHub**
3. **Select repo**: `gregormortis/tryhardly`
4. **Add PostgreSQL**:
   - Click "+ New"
   - Select "Database" > "PostgreSQL"
5. **Configure Backend Service**:
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm start`
6. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your_super_secret_key_here
   JWT_EXPIRES_IN=7d
   STRIPE_SECRET_KEY=sk_live_your_key
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```
7. **Add Redis** (Optional):
   - Click "+ New" > "Database" > "Redis"
   - Add `REDIS_URL` to environment

8. **Run Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

### Option 2: Netlify (Frontend) + Render (Backend)

Similar to Option 1, both offer free tiers.

---

## 🏢 GoDaddy VPS Deployment (Paid)

**Requirements**: GoDaddy VPS with root access ($5-20/month)

### Step 1: Purchase GoDaddy VPS

1. Go to GoDaddy.com
2. Products > Servers > VPS Hosting
3. Choose plan (minimum 1 core, 1GB RAM)
4. Complete purchase

### Step 2: SSH Access

1. Get SSH credentials from GoDaddy dashboard
2. Connect:
   ```bash
   ssh root@your-vps-ip
   ```

### Step 3: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 4: Setup PostgreSQL

```bash
sudo -u postgres psql

# In PostgreSQL:
CREATE DATABASE tryhardly;
CREATE USER tryhardly WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE tryhardly TO tryhardly;
\q
```

### Step 5: Clone and Setup Project

```bash
cd /var/www
git clone https://github.com/gregormortis/tryhardly.git
cd tryhardly

# Backend setup
cd backend
npm install

# Create .env file
nano .env
```

**backend/.env**:
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://tryhardly:your_password@localhost:5432/tryhardly
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://yourdomain.com
```

```bash
# Run migrations
npx prisma generate
npx prisma migrate deploy

# Start with PM2
pm2 start npm --name "tryhardly-backend" -- start
pm2 save
pm2 startup
```

### Step 6: Frontend Setup

```bash
cd /var/www/tryhardly/frontend
npm install

# Create .env.local
nano .env.local
```

**frontend/.env.local**:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "tryhardly-frontend" -- start
pm2 save
```

### Step 7: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/tryhardly
```

**Nginx config**:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tryhardly /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: SSL Certificate (Free)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## ✅ Deployment Checklist

- [ ] Domain name registered
- [ ] Environment variables configured
- [ ] Database provisioned
- [ ] Redis configured (optional)
- [ ] Stripe keys added
- [ ] SSL certificate installed
- [ ] Database migrations run
- [ ] PM2 processes running
- [ ] Nginx configured
- [ ] DNS records pointing to server
- [ ] Firewall configured
- [ ] Backup strategy in place

---

## 🔧 Post-Deployment

### Monitor Application

```bash
pm2 status
pm2 logs tryhardly-backend
pm2 logs tryhardly-frontend
```

### Update Application

```bash
cd /var/www/tryhardly
git pull

cd backend
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart tryhardly-backend

cd ../frontend
npm install
npm run build
pm2 restart tryhardly-frontend
```

---

## 🚨 Why GoDaddy Shared Hosting Won't Work

GoDaddy shared hosting only supports:
- PHP applications
- MySQL databases
- Static HTML/CSS/JS

Tryhardly requires:
- Node.js runtime ❌
- PostgreSQL database ❌
- Long-running processes ❌
- WebSocket support ❌

**Solution**: Use GoDaddy VPS OR switch to Vercel + Railway (recommended)

---

## 📞 Support

For deployment issues:
1. Check logs: `pm2 logs`
2. Verify environment variables
3. Check database connection
4. Review Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

---

## 🎯 Quick Deploy Commands

**One-command deploy** (after initial setup):

```bash
cd /var/www/tryhardly && git pull && cd backend && npm install && npx prisma generate && npx prisma migrate deploy && pm2 restart all && cd ../frontend && npm install && npm run build && pm2 restart all
```
