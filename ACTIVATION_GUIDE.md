# 🚀 Tryhardly Activation Guide

This guide will help you activate **ALL functions and features** to make tryhardly.com a fully working application with real database, authentication, and interactive client inputs.

## 📉 Current Status

✅ **Completed:**
- Database schema (Prisma)
- Seed data file with sample users, quests, guilds
- Frontend pages (dashboard, questboard, guilds, profile, auth)
- Backend controllers and routes structure
- Tailwind CSS with quest-themed design

❌ **What's Missing** (Why site looks like a landing page):
- Backend is NOT deployed
- Database is NOT provisioned
- Frontend is NOT connected to backend API
- Forms don't submit to real API
- Authentication doesn't work

## 🔥 Quick Activation (30 Minutes)

Follow these steps to make EVERYTHING work:

### Step 1: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"** > **"Deploy from GitHub"**
4. Select `gregormortis/tryhardly` repository
5. Choose **"main"** branch
6. Railway will auto-detect the backend

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** > **"PostgreSQL"**
3. Wait for database to provision (1-2 minutes)

### Step 3: Configure Backend Environment

1. Click on your backend service
2. Go to **"Variables"** tab
3. Add these environment variables:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your_super_secret_key_change_this_to_random_string
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://www.tryhardly.com
```

4. Click **"Deploy"**

### Step 4: Run Database Migrations

1. In Railway backend service, go to **"Settings"** tab
2. Find **"Deploy Command"**
3. Add: `npm install && npx prisma generate && npx prisma migrate deploy && npm start`
4. Or run migrations manually:
   - Click **"Deployments"** tab
   - Click latest deployment
   - Click **"View Logs"**
   - Once deployed, go to settings and trigger new deployment

### Step 5: Seed the Database

1. In Railway, go to your backend service
2. Click **"Settings"** > **"Deploy"** 
3. In terminal/logs, run: `npx prisma db seed`
4. Or add to package.json:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

### Step 6: Get Backend URL

1. In Railway backend service
2. Go to **"Settings"** tab
3. Click **"Generate Domain"**
4. Copy the URL (e.g., `https://tryhardly-backend-production.up.railway.app`)

### Step 7: Update Frontend Environment

1. In Vercel (where frontend is deployed)
2. Go to Project Settings > Environment Variables
3. Add:

```env
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app
```

4. Redeploy frontend

### Step 8: Update Frontend API Calls

The frontend pages need to call the real API. Update these files:

#### `frontend/lib/api.ts` (create if doesn't exist):

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = {
  async get(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`);
    return res.json();
  },
  
  async post(endpoint: string, data: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
```

#### Update `frontend/app/questboard/page.tsx`:

```typescript
// Instead of mock data:
const quests = await api.get('/api/quests');
```

## 🛠️ Features to Activate

### 1. Authentication (Register/Login)

**Backend**: Already has `authController.ts`

**Frontend**: Update `frontend/app/auth/register/page.tsx`:

```typescript
const handleSubmit = async (e) => {
  e.preventDefault();
  const data = await api.post('/api/auth/register', {
    email, username, password, displayName
  });
  // Store token, redirect to dashboard
};
```

### 2. Quest Posting

**Frontend**: Update `frontend/app/post-quest/page.tsx`:

```typescript
const handleSubmit = async (formData) => {
  const quest = await api.post('/api/quests', formData);
  router.push(`/quests/${quest.id}`);
};
```

### 3. Questboard (Browse Quests)

**Frontend**: Update `frontend/app/questboard/page.tsx`:

```typescript
const quests = await api.get('/api/quests?status=OPEN');
// Display real quests from database
```

### 4. User Dashboard

**Frontend**: Update `frontend/app/dashboard/page.tsx`:

```typescript
const user = await api.get('/api/users/me');
const myQuests = await api.get('/api/quests/my-quests');
const applications = await api.get('/api/applications/my-applications');
```

### 5. Guild System

**Frontend**: Update `frontend/app/guilds/page.tsx`:

```typescript
const guilds = await api.get('/api/guilds');
// Display real guilds with members, levels, XP
```

## 📝 Test Credentials

After seeding the database, you can log in with:

```
Email: alice@tryhardly.com
Password: password123
```

Or create new accounts via the registration form!

## ✅ Verification Checklist

After activation, verify these work:

- [ ] Register new account
- [ ] Login with credentials
- [ ] View real quests on questboard
- [ ] Post a new quest
- [ ] Apply to a quest
- [ ] View user dashboard with real data
- [ ] Browse guilds
- [ ] View user profiles
- [ ] See XP, level, reputation updating
- [ ] Receive notifications

## 🐛 Common Issues

### Issue: "Cannot connect to backend"

**Solution**: Check CORS settings in backend `app.ts`:

```typescript
app.use(cors({
  origin: ['https://www.tryhardly.com', 'https://tryhardly.com'],
  credentials: true
}));
```

### Issue: "Database connection failed"

**Solution**: Verify `DATABASE_URL` environment variable is set correctly in Railway

### Issue: "Forms don't submit"

**Solution**: Check browser console for API errors. Ensure `NEXT_PUBLIC_API_URL` is set in Vercel

## 💡 Pro Tips

1. **Use Railway CLI** for faster debugging:
   ```bash
   railway login
   railway link
   railway run npx prisma studio
   ```

2. **Monitor logs** in Railway dashboard to see API requests

3. **Test locally first**:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```

4. **Frontend local testing**:
   ```bash
   cd frontend
   npm install
   # Create .env.local with:
   # NEXT_PUBLIC_API_URL=http://localhost:4000
   npm run dev
   ```

## 🎉 Success!

Once activated, tryhardly.com will be a **fully functional** quest marketplace with:

- ✅ Real user authentication
- ✅ Working quest posting and browsing
- ✅ Active application system
- ✅ Functional guild system
- ✅ Live dashboards with real data
- ✅ XP, leveling, and gamification working
- ✅ Database-backed profiles

---

**Need help?** Check the deployment logs in Railway or open an issue on GitHub.
