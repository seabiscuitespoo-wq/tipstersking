# 👑 TipstersKing

A Netflix-style marketplace for football betting tips. Subscribers pay €9.99/month for real-time access to all tips from verified tipsters. Tipsters earn from a monthly revenue pool based on their ROI ranking.

## 🚀 Live Demo

**Production:** https://tipster-saas-mu.vercel.app

## ✨ Features

### For Subscribers
- 📱 Real-time tips via Telegram VIP channel
- 📊 Leaderboard with 90-day ROI tracking
- 💳 €9.99/mo subscription (EUR/USD/GBP)
- 🆓 Free channel with 2-hour delayed tips

### For Tipsters
- 🎯 Submit tips via web dashboard
- 📈 Track ROI and win rate
- 💰 Earn from top 10 monthly commission pool
- 🔗 Stripe Connect Express payouts

### Anti-Manipulation
- ⏰ 60-minute deadline before kickoff
- 🔒 Tips are immutable (no edit/delete)
- 📊 Flat 1-unit ROI calculation
- ✅ Server-side timestamp validation

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, Tailwind CSS |
| Backend | Next.js API Routes, Vercel Serverless |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe + Connect Express |
| Messaging | Telegram Bot API |
| Data | API-Football |
| Hosting | Vercel Pro |

## 📁 Project Structure

```
src/
├── app/
│   ├── [locale]/          # i18n routes (en/es)
│   │   ├── dashboard/     # User dashboards
│   │   ├── leaderboard/   # ROI rankings
│   │   ├── login/         # Auth pages
│   │   └── pricing/       # Subscription
│   ├── api/
│   │   ├── cron/          # Scheduled jobs
│   │   ├── stripe/        # Webhooks
│   │   ├── telegram/      # Bot webhook
│   │   └── tipster/       # Tip submission
│   └── auth/callback/     # OAuth callback
├── components/            # Reusable UI
├── lib/
│   ├── api-football.ts    # Match data
│   ├── telegram.ts        # Bot + channels
│   ├── tips.ts            # Core tip logic
│   └── supabase.ts        # DB client
└── messages/              # i18n translations
```

## ⚙️ Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_EUR=
STRIPE_PRICE_USD=
STRIPE_PRICE_GBP=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_VIP_CHANNEL_ID=
TELEGRAM_FREE_CHANNEL_ID=
TELEGRAM_ADMIN_CHAT_ID=

# API-Football
API_FOOTBALL_KEY=

# Cron
CRON_SECRET=
```

## 🔄 Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| fetch-matches | Daily 02:00 | Fetch upcoming matches |
| update-results | Every 30min | Update scores & tip results |
| free-channel | Every 5min | Publish delayed tips |
| commissions | Monthly 1st | Calculate tipster payouts |

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📊 Database Schema

Key tables:
- `profiles` - User accounts
- `tipster_profiles` - Tipster info & stats
- `matches` - Football fixtures
- `tips` - Submitted predictions
- `subscriptions` - Stripe subscriptions
- `monthly_commissions` - Tipster payouts

## 🌍 Internationalization

Supported languages:
- 🇬🇧 English (en)
- 🇪🇸 Spanish (es)

## 📈 Supported Leagues

1. La Liga
2. Premier League
3. UEFA Champions League
4. UEFA Europa League
5. Bundesliga
6. Serie A
7. Ligue 1
8. Eredivisie
9. Primeira Liga
10. Brasileirão
11. MLS

## 📄 License

MIT

---

Built with ❤️ by TipstersKing
