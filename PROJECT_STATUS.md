# Tryhardly — Project Status & Build Brief

_Last updated: 2026-04-01_

## What It Is
A gamified gig marketplace — freelance work reframed as quests, teams as guilds, reputation as XP/levels/achievements, with built-in escrow for payment safety. Think Craigslist meets World of Warcraft.

**Domain:** tryhardly.com  
**Repo:** https://github.com/gregormortis/tryhardly  
**Deploy:** Vercel (frontend) + Railway (backend, planned)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Zustand, Shadcn/ui |
| Backend | Express.js, TypeScript, Prisma ORM, JWT auth |
| Database | PostgreSQL (Neon on Vercel Storage) |
| Payments | Stripe Connect (planned, dep installed) |
| Real-time | Socket.io (planned, dep installed) |
| Cache | Redis / ioredis (planned, dep installed) |

---

## What's Built ✅

### Frontend Pages (20 routes)
- **Marketing:** Home, About, Pricing, FAQ, Contact, Terms, Privacy
- **Core:** Questboard (list + detail), Post Quest, Guilds (list + detail + create), Leaderboard, Dashboard, Profile
- **Auth:** Login, Register

### Backend API
- **Auth:** POST `/api/auth/register`, POST `/api/auth/login`, GET `/api/auth/me`
- **Quests:** Full CRUD + complete + apply + list applications
- **Users:** Routes exist (controller present)
- **Guilds:** Routes exist (controller present)

### Database Schema (Prisma)
- User (with level, XP, class, reputation)
- Quest (categories, difficulty tiers, budget, status lifecycle)
- Application (cover letter, proposed budget, status)
- Guild + GuildMember (with roles: Leader/Officer/Member)
- Milestone (per-quest, with payment amounts + status)
- Achievement + UserAchievement
- Message (direct messaging)
- Notification (typed: quest events, level up, achievements)

### Infrastructure
- API client (`lib/api.ts`) with JWT token handling
- Auth context (`lib/auth.tsx`)
- Navbar + Footer components
- Dark gaming theme with amber/gold accents
- Docker Compose config

---

## What's Missing / Needs Work 🔧

### Critical Path (MVP)
- [ ] **Auth flow end-to-end** — Frontend forms exist but need wiring to backend
- [ ] **Quest posting flow** — Form → API → DB → display on questboard
- [ ] **Quest application flow** — Apply → notify poster → accept/reject
- [ ] **Escrow/payment integration** — Stripe Connect setup, milestone-based releases
- [ ] **User profiles** — Display level, XP, achievements, quest history
- [ ] **Dashboard** — Real data (my quests, my applications, earnings, XP)

### Phase 2 (Enhancement)
- [ ] Guild functionality — Create, join, manage members, guild quests
- [ ] Achievement system — Trigger + award logic
- [ ] XP/leveling engine — Calculate and award on quest completion
- [ ] Messaging — Real-time with Socket.io
- [ ] Notifications — In-app + email (SendGrid)
- [ ] Quest matching/search — Filters, sorting, smart recommendations
- [ ] Leaderboard — Pull from real user data

### Phase 3 (Scale)
- [ ] Mobile apps
- [ ] Advanced skill trees
- [ ] Seasonal events
- [ ] NFT badges (optional)

---

## Key Design Decisions (from Perplexity context)
- **Quest difficulty tiers:** Novice → Apprentice → Journeyman → Expert → Master → Legendary
- **User classes:** Warrior (Dev), Mage (Designer), Rogue (Writer), Cleric (Support)
- **Guild roles:** Leader, Officer, Member
- **Platform fee:** 12% commission
- **Quest types:** Side Quest ($50-500), Main Quest ($500-2000), Epic Quest ($2000+), Daily Quest, Guild Quest
- **Escrow model:** Funds locked on quest acceptance, released on completion approval (milestone-based)

---

## Git History Summary
- 20 commits, mostly frontend page creation and styling
- Recent commits: PostCSS/Tailwind fixes, dark theme, page scaffolding
- No backend deployment commits yet
- No test commits yet
