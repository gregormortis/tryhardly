# 🗡️ Tryhardly - Guild-Inspired Quest Gig Marketplace

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

**Tryhardly** transforms freelance work into an epic adventure. Post quests, complete missions, level up, join guilds, and earn rewards in the most gamified gig marketplace ever created.

## ✨ Features

### 🎮 Gamification System
- **Level 1-100+**: Progress through ranks from Novice Adventurer to Legendary Hero
- **XP & Skill Trees**: Earn experience and specialize in your class (Warrior/Developer, Mage/Designer, Rogue/Writer)
- **Achievements & Badges**: Unlock rare achievements and show off your accomplishments
- **Reputation System**: Build your legend through quality work

### 📋 Quest System
- **Quest Types**: Side Quests, Main Quests, Epic Quests, Daily Quests, Guild Quests
- **Difficulty Ratings**: ⭐ to ⭐⭐⭐⭐⭐ star system
- **Quest Board**: Beautiful, filterable interface for discovering work
- **Quest Chains**: Build long-term relationships through connected projects

### 🏰 Guild System
- **Form Guilds**: Create teams/agencies with friends
- **Guild Ranks**: Founder, Leader, Officer, Member hierarchies
- **Collaborative Quests**: Take on large projects together
- **Guild Reputation**: Build collective credibility

### 💰 Payment & Escrow
- **Secure Payments**: Stripe integration with escrow system
- **Gold Currency**: Work is rewarded in "Gold" (real money)
- **Platform Fee**: Fair 12% commission
- **Fast Payouts**: Receive funds within 2-3 business days

### 💬 Communication
- **In-App Messaging**: Direct communication between quest givers and adventurers
- **Real-time Notifications**: Never miss an opportunity
- **Quest Updates**: Track progress and deliverables

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand
- **UI Components**: Shadcn/ui + Custom RPG components

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis
- **Real-time**: Socket.io
- **Payments**: Stripe Connect

### Infrastructure
- **Hosting**: Vercel (Frontend) + Railway (Backend)
- **CDN**: Cloudflare
- **Email**: SendGrid
- **Monitoring**: Sentry
- **Analytics**: PostHog

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis
- Stripe Account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/gregormortis/tryhardly.git
cd tryhardly
```

2. **Install dependencies**
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. **Set up environment variables**
```bash
# Frontend
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your values

# Backend
cd ../backend
cp .env.example .env
# Edit .env with your values
```

4. **Set up database**
```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

5. **Run development servers**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the app!

## 📚 Project Structure

```
tryhardly/
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/       # Next.js 14 App Router pages
│   │   ├── components/ # React components
│   │   ├── lib/       # Utilities and API client
│   │   ├── hooks/     # Custom React hooks
│   │   └── types/     # TypeScript types
│   └── public/        # Static assets
│
├── backend/            # Express.js backend API
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   ├── middleware/ # Express middleware
│   │   └── socket/     # Socket.io handlers
│   └── prisma/         # Database schema & migrations
│
├── docs/               # Documentation
└── docker-compose.yml  # Docker configuration
```

## 🎯 Roadmap

### Phase 1: MVP (Months 1-3) ✅
- [x] User authentication & profiles
- [x] Quest posting & browsing
- [x] Basic gamification (levels, XP)
- [x] Payment integration
- [x] Messaging system
- [x] Quest acceptance & completion workflow

### Phase 2: Enhancement (Months 4-6)
- [ ] Guild system
- [ ] Advanced quest matching
- [ ] Quest chains
- [ ] Achievement badges
- [ ] Mobile responsive design
- [ ] Email notifications

### Phase 3: Scale (Months 6-12)
- [ ] Native mobile apps (iOS/Android)
- [ ] NFT badge integration
- [ ] Advanced skill trees
- [ ] Seasonal events & competitions
- [ ] Marketplace for digital goods
- [ ] Video quest briefings

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🌟 Acknowledgments

- Inspired by guild systems in MMORPGs like World of Warcraft and Final Fantasy XIV
- Built with amazing open-source tools and frameworks
- Special thanks to the community for feedback and support

## 📞 Contact

- **Repository**: https://github.com/gregormortis/tryhardly
- **Issues**: https://github.com/gregormortis/tryhardly/issues
- **Discussions**: https://github.com/gregormortis/tryhardly/discussions

---

**Made with ⚔️ by adventurers, for adventurers**

## 🎮 Core Concepts

### Quest Types
- **Side Quest**: Small, quick tasks ($50-$500, 1-3 days)
- **Main Quest**: Medium projects ($500-$2000, 1-2 weeks)
- **Epic Quest**: Large, complex projects ($2000+, 2+ weeks)
- **Daily Quest**: Recurring tasks with bonuses
- **Guild Quest**: Team-based collaborative projects

### Experience & Leveling
- Complete quests to earn XP
- Level up to unlock higher-tier quests
- Specialize in skill trees (Development, Design, Writing, Marketing, etc.)
- Earn titles and badges for achievements

### Guild System
- Form or join guilds with other adventurers
- Take on larger quests as a team
- Share guild treasury and resources
- Compete in guild rankings and events

## 🔒 Security

- All payments are processed securely through Stripe
- Escrow system protects both quest givers and adventurers
- Two-factor authentication available
- Regular security audits

For security issues, please email security@tryhardly.com
