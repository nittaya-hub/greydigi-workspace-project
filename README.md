# greydigi workspace

One workspace, three spaces — Delivery, Product, Hypercare — plus a public
client-share layer, built from the greydigi Claude Design source
(`project/Greydigi Workspace Screens.dc.html`) and wired to Supabase.

**Start here:**

- [`docs/GUIDE.en.md`](docs/GUIDE.en.md) — setup and user guide (English)
- [`docs/GUIDE.th.md`](docs/GUIDE.th.md) — คู่มือการติดตั้งและการใช้งาน (ภาษาไทย)
- [`docs/CHECKLIST.en.md`](docs/CHECKLIST.en.md) — setup checklist (English)
- [`docs/CHECKLIST.th.md`](docs/CHECKLIST.th.md) — เช็คลิสต์การติดตั้ง (ภาษาไทย)
- [`supabase/README.md`](supabase/README.md) — database migration details

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project details
npm run dev
```

See `docs/GUIDE.en.md` for the full walkthrough, including applying the
database migrations before the app has anything to show.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres, Auth, RLS)
