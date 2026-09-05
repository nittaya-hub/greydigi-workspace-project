# Setup checklist

A step-by-step checklist for getting greydigi workspace running. See
`GUIDE.en.md` for full explanations of each step.

## Local setup

- [ ] Node.js 20+ installed (`node -v` to check)
- [ ] Project files unzipped / repository cloned
- [ ] `npm install` run inside `web/` with no errors
- [ ] Supabase project created at supabase.com
- [ ] Project URL copied (Settings → API)
- [ ] Anon / publishable key copied (Settings → API)
- [ ] Service role / secret key copied (Settings → API) — **kept private**
- [ ] `.env.local` created (`cp .env.example .env.local`) and filled in:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` for local dev)
- [ ] `http://localhost:3000/auth/callback` added to Supabase Authentication
      → URL Configuration → Redirect URLs
- [ ] (Optional) Google sign-in enabled: OAuth client created in Google
      Cloud, Client ID/Secret pasted into Supabase Authentication →
      Providers → Google, provider toggled on

## Database

- [ ] `supabase/migrations/0001_extensions_enums.sql` run — succeeded
- [ ] `0002_core.sql` run — succeeded
- [ ] `0003_delivery.sql` run — succeeded
- [ ] `0004_product.sql` run — succeeded
- [ ] `0005_hypercare.sql` run — succeeded
- [ ] `0006_state_engine.sql` run — succeeded
- [ ] `0007_rls.sql` run — succeeded
- [ ] `0008_projections.sql` run — succeeded
- [ ] `0009_product_extensions.sql` run — succeeded
- [ ] (Optional demo data) `supabase/seed.sql` run — succeeded

## First user

- [ ] User created in Supabase → Authentication → Users, with a password
      you'll remember, "Auto Confirm User" ticked
- [ ] User UID copied
- [ ] `insert into people (...)` run in the SQL editor with your UID,
      `kind = 'internal'`, `workspace_role = 'workspace_admin'`
- [ ] (If you skipped the seed) a `workspaces` row exists before the
      `people` insert above

## First run

- [ ] `npm run dev` starts with no errors
- [ ] App loads at `http://localhost:3000` and shows the sign-in page
- [ ] Signed in successfully with email + the password you set (Email &
      password tab) — or via the Magic link tab, or Continue with Google
      if enabled
- [ ] Sidebar shows your workspace name and your name/role at the bottom

## Adding team members

- [ ] Signed in as a workspace admin
- [ ] Sidebar → Users and members → Invite (`/people/invite`) opens
- [ ] Invited a test team member (name, email, role, kind) and received a
      one-time temporary password
- [ ] New member signed in with that email + temporary password
- [ ] New member changed their password at Settings → Change your
      password (`/auth/set-password`)

## Feature check

- [ ] Workspace Overview (`/`) shows real numbers (or a clean empty state
      if you skipped the seed)
- [ ] Delivery → Projects lists at least one project (with seed data)
- [ ] Opening a project shows its tabs and the "Where we are" panel
- [ ] Product → Products / Roadmap load without errors
- [ ] Hypercare → Services / Incidents load without errors
- [ ] Settings page loads, and Save works after editing the workspace name
- [ ] A project's **Client view config** page loads; clicking **Publish**
      shows an updated "last published" date
- [ ] A **Share link** created on a project opens correctly at `/s/<token>`
      with no login required
- [ ] Sidebar **Log out** signs you out and returns you to the sign-in page

## Before going to production

- [ ] Environment variables set in the hosting provider (same as
      `.env.local`)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real production domain
- [ ] `https://<your-domain>/auth/callback` added to Supabase Redirect URLs
- [ ] Production workspace admin(s) provisioned (repeat "First user" above
      against the production database)
- [ ] Decided whether to run `supabase/seed.sql` against production
      (usually: **no** — seed data is for demos/dev only)
