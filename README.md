# 🎯 TipsterHub

Monetisoi vedonlyöntitipsisi sekunneissa. Luo maksullinen Telegram/Discord-yhteisö, seuraa tilastojasi automaattisesti.

## Ominaisuudet

- 📊 **Automaattinen ROI-seuranta** - Kirjaa vedot, tilastot lasketaan automaattisesti
- 📱 **Telegram & Discord** - Automaattinen jäsenhallinta
- 💳 **Stripe-maksut** - Tilaukset suoraan tilillesi
- 🎨 **Landing-sivu** - Valmiit templatet tipsteri-sivuille
- 🔔 **Signal Alerts** - Lähetä vedot yhteisöön yhdellä klikkauksella

## Käynnistys (kehitys)

```bash
# 1. Asenna riippuvuudet
npm install

# 2. Kopioi environment-tiedosto
cp .env.example .env.local

# 3. Täytä .env.local oikeilla arvoilla

# 4. Käynnistä kehityspalvelin
npm run dev
```

Avaa [http://localhost:3000](http://localhost:3000)

## Setup

### 1. Supabase (tietokanta)

1. Luo tili: https://supabase.com
2. Luo uusi projekti
3. Kopioi URL ja anon key → `.env.local`

### 2. Stripe (maksut)

1. Luo tili: https://stripe.com
2. Kopioi API-avaimet → `.env.local`
3. Luo tuote + hinta Stripe Dashboardissa
4. Aseta webhook endpoint: `https://yourdomain.com/api/stripe/webhook`

### 3. Telegram Bot

1. Avaa @BotFather Telegramissa
2. Lähetä `/newbot` ja seuraa ohjeita
3. Kopioi bot token → `.env.local`
4. Lisää botti kanavallesi adminiksi

## Tech Stack

- **Frontend:** Next.js 16, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe
- **Hosting:** Vercel (suositus)

## Kansiorakenne

```
src/
├── app/
│   ├── page.tsx           # Landing page
│   ├── login/             # Kirjautuminen
│   ├── register/          # Rekisteröinti
│   ├── dashboard/         # Tipsterin hallintapaneeli
│   └── api/
│       ├── stripe/        # Stripe checkout + webhook
│       └── telegram/      # Telegram bot API
```

## Deployment (Vercel)

```bash
# 1. Asenna Vercel CLI
npm i -g vercel

# 2. Deploytaa
vercel

# 3. Lisää environment-muuttujat Vercel dashboardissa
```

## Hinta

- **29€/kk** + 2% transaktiomaksu
- Ei rajoituksia tilaajamäärässä

---

Built with 🐋 by Bubba
