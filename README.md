# Nur Engineering POS (Nur Engineering ERP)

Bilingual (বাংলা + English) ERP & POS for EEE / lab equipment — products, suppliers, purchases, sales, and stock.

**Repo:** [alamin-87/Nur-engineering-pos](https://github.com/alamin-87/Nur-engineering-pos)

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- MongoDB (Mongoose) — Product ↔ ProductSupplier ↔ Contact(supplier)
- next-intl (bn / en)
- jsPDF + ExcelJS invoices
- Recharts dashboard
- GSAP UI motion

## Quick start

```bash
npm install
cp .env.example .env.local
# set MONGODB_URI and AUTH_SECRET
npm run dev
```

Open http://localhost:3000

Demo login (after seed):

- Email: `admin@ditpharma.bd`
- Password: `admin123`

Force reseed (logged in):

```bash
# POST /api/seed  body: { "force": true }
```

## Environment

```
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/nur_engineering_erp
AUTH_SECRET=change-me-to-a-long-random-string
NEXT_PUBLIC_APP_NAME=Nur Engineering ERP
NEXT_PUBLIC_DEFAULT_LOCALE=bn
```

For local demo without Docker you can use `MONGODB_URI=memory` (data resets when the process restarts).

## Deploy (Vercel)

1. Push this repo to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Set environment variables (`MONGODB_URI`, `AUTH_SECRET`, …)
4. Deploy

**Note:** Production needs a real MongoDB Atlas URI — in-memory Mongo does not work on Vercel serverless.

## Modules

- Dashboard KPIs + filters
- POS (cash / bKash / Nagad / Rocket / card / cheque / credit)
- Sales + invoice PDF / Excel
- Products (supplier price list), Contacts, Purchases, Stock, Expenses
- Reports, Settings
- CRM + Manufacturing helpers
