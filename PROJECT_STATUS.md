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
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Zustand, React Query |
| Backend | Express.js, TypeScript, Prisma ORM, JWT auth |
| Database | PostgreSQL (Neon on Vercel Storage) |
| Payments | Stripe Connect (escrow service built) |
| Real-time | Socket.io (planned, dep installed) |
| Cache | Redis / ioredis (planned, dep installed) |

---

## What's Built ✅

### Frontend (20 routes, all wired to API)
- **Marketing:** Home, About, Pricing, FAQ, Contact, Terms, Privacy
- **Core:** Questboard (list + detail + filters), Post Quest (form → API), Guilds (list + detail + create), Leaderboard (API + podium), Dashboard (my quests/apps/stats), Profile (view + edit)
- **Auth:** Login, Register — fully wired to backend via AuthProvider
- **Components:** Auth-aware Navbar (user menu, level, logout), ProtectedRoute, QuestList (real API)
- **Types:** Full TypeScript interfaces for Quest, User, Guild, Application, Achievement, Milestone

### Backend API (complete)
- **Auth:** Register, Login, Get Current User (JWT)
- **Quests:** Full CRUD + complete + apply + list applications + accept application
- **Users:** Public profile, get/update self, leaderboard, my applications
- **Guilds:** CRUD + join + leave
- **Payments:** Stripe Connect onboarding, escrow init, milestone release, quest complete/cancel, webhook
- **Gamification:** XP progress, achievements (catalog + user), leaderboard, reputation, stats

### Backend Services (6 service modules)
- `stripeService.ts` — Stripe Connect accounts, PaymentIntents, transfers, refunds
- `escrowService.ts` — Full escrow lifecycle (init → fund → milestone release → complete/refund)
- `xpService.ts` — Level curve (1-100), XP awards, progress calculation
- `achievementService.ts` — 20 achievements with auto-check trigger system
- `reputationService.ts` — Score calculation + 6 reputation tiers
- `gamificationService.ts` — Orchestrator (onQuestCompleted, onReviewReceived, onGuildJoined, etc.)

### Database Schema (Prisma — fully aligned)
- User (level, XP, class, reputation, Stripe IDs, guild)
- Quest (categories, difficulty, reward, tags, escrow status, milestones)
- Application (cover letter, proposed rate, status)
- Guild + GuildMember (tag, leader, public/private, reputation)
- Milestone (per-quest, amounts, completion tracking)
- Achievement + UserAchievement
- Message, Notification, Review
- Enums: EscrowStatus, QuestStatus, QuestDifficulty, QuestCategory, UserClass, etc.

### Seed Data
- 5 users (Alice, Bob, Carol, David, Eve) with varied levels/classes
- 10 quests across all categories and difficulties
- 2 guilds with members
- 10 achievements, awarded to users
- Milestones, applications, reviews

---

## What Still Needs Work 🔧

### High Priority
- [ ] **Deploy backend** — Set up Railway/Docker, connect to Neon DB
- [ ] **Environment setup** — Stripe keys, JWT secret, DB URL in production
- [ ] **Stripe Connect onboarding UI** — Frontend flow for adventurers to set up payouts
- [ ] **Real-time messaging** — Socket.io integration for chat + notifications
- [ ] **Email notifications** — SendGrid for quest updates, achievements, etc.

### Medium Priority
- [ ] **Quest search/filter** — Frontend filter bar works, needs URL params + debounce
- [ ] **Image uploads** — Avatars, guild badges (S3/Cloudinary)
- [ ] **Quest application management** — UI for quest giver to accept/reject apps
- [ ] **Review system UI** — Rate adventurer after quest completion
- [ ] **Mobile responsive** — Test and fix breakpoints

### Nice to Have
- [ ] **Socket.io notifications** — Real-time toast notifications
- [ ] **Activity feed** — Timeline of user actions
- [ ] **Quest chains** — Linked multi-part projects
- [ ] **Seasonal events** — Time-limited bonus XP
- [ ] **Advanced analytics** — PostHog / Sentry integration

---

## Key Design Decisions
- **Quest difficulty tiers:** Novice → Apprentice → Journeyman → Expert → Master → Legendary
- **User classes:** Warrior (Dev), Mage (Designer), Rogue (Writer), Cleric (Support)
- **Reputation tiers:** Untrusted → Newcomer → Reliable → Trusted → Elite → Legendary
- **Platform fee:** 12% commission on escrow release
- **XP curve:** `xpForLevel(n) = floor(100 * n^1.5)` — Level 10 needs ~3,162 XP, Level 50 needs ~35,355
- **Escrow lifecycle:** NONE → PENDING → FUNDED → PARTIALLY_RELEASED → RELEASED (or REFUNDED)

---

## Test Credentials
All seeded accounts use password: `password123`
- alice@tryhardly.com (Warrior, Level 15)
- bob@tryhardly.com (Mage, Level 12)
- carol@tryhardly.com (Rogue, Level 10)
- david@tryhardly.com (Warrior, Level 5 — quest giver)
- eve@tryhardly.com (Cleric, Level 8)
