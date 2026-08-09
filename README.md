# TryHardly — Local Services Marketplace

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

**TryHardly** is a US local services marketplace that connects customers who need hands-on
work done with verified independent workers nearby. Launching Redding, California first.

Typical jobs: yard work and mowing, hauling and dump runs, moving help, cleaning,
errands, and basic handyman tasks.

## How it works

1. A customer posts a job with a description, location, budget, and timing. Posting is free.
2. Local workers submit bids with their price.
3. The customer accepts a bid. Their payment method is **authorized** at booking — an
   authorization is not a charge.
4. The worker completes the job and the customer confirms completion.
5. The charge is **captured** for the completed work, and the worker payout is processed
   through Stripe Connect after capture.
6. TryHardly earns a flat **12% platform service fee** on completed paid jobs.

TryHardly is a marketplace facilitator. It is not the service provider, does not hold
customer funds, and does not provide regulated financial services. All payment processing
and worker payouts run through Stripe and Stripe Connect.

## Features

### Marketplace
- Public job board with category and location filtering
- Multi-step job posting that requires no account until the final publish step
- Structured bidding with material, labor, and timeline breakdowns
- Direct messaging between customers and workers
- Recurring jobs for repeat work such as mowing and cleaning

### Payments
- Stripe Checkout with `capture_method: 'manual'` — authorize at booking, capture on completion
- Destination charges via Stripe Connect with a 12% `application_fee_amount`
- Stripe Connect Express onboarding for worker payouts
- Cancelling before completion voids the authorization

### Trust and safety
- Mandatory email verification before a worker can create a connected account
- Stripe Identity government ID and selfie verification before a worker's first payout
- Rate limiting and duplicate-checkout blocking on all payment endpoints
- Professional credentials, licenses, and proof-of-work galleries on worker profiles
- Reviews written only by people who completed a job together
- Public policy pages: terms, refunds, privacy, community guidelines, prohibited services

### Reputation
- Ratings, skill badges, and experience tiers that affect visibility and trust only — never
  the fee, which stays a flat 12% for every worker at every level
- Worker teams for shared standards and mentoring

## Tech Stack

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

**Built in Redding, California.**

## 🔒 Security

- All marketplace payments are processed securely through Stripe
- Charges are captured only after a job is confirmed complete; worker payouts are processed
  through Stripe Connect after capture
- Two-factor authentication available
- Regular security audits

For security issues, please email security@tryhardly.com
