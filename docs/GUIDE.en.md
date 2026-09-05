# greydigi workspace — setup and user guide

## 1. What this is

One workspace with three connected spaces, built from the Claude Design
mockups and wired to a real Supabase database:

- **Delivery** — client engagements: projects, flight plans, gates, tasks,
  baselines, change requests, client updates, and the client-facing layer
  (client view config, public share links, the client portal).
- **Product** — internal accelerators: products, roadmap, features,
  releases, engineering workload.
- **Hypercare** — live client systems after go-live: services, incidents,
  requests, SLA, health, escalations.
- **Workspace core** — clients, people and roles, templates, notifications,
  settings, audit log, search — shared by all three spaces.
- **Client-facing pages**, outside the internal app entirely:
  - `/s/[token]` — a public, no-login, read-only project page for anyone
    with a valid share link.
  - `/portal/[project-ref]` — the authenticated client portal, where a
    client can review progress and complete requested actions.

Every number on screen (gate status, project health, service health,
release readiness) is computed by the database, not typed by hand on a
page — the same figure will always agree across every screen that shows it.

## 2. Prerequisites

- **Node.js 20 or newer** and npm (check with `node -v`)
- A **Supabase account** — free tier is enough to start ([supabase.com](https://supabase.com))
- A terminal / command line

## 3. Install the project

1. Unzip the project files you were given, or clone the repository.
2. Open a terminal in the project's `web/` folder.
3. Install dependencies:

   ```bash
   npm install
   ```

## 4. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Once it's ready, open **Settings → API**. You'll need three values:
   - **Project URL**
   - **Publishable / anon public key**
   - **Secret / service_role key** (keep this one private — never share it
     or put it in a public place)

## 5. Configure environment variables

1. In the `web/` folder, copy the example env file:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<your Project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon/publishable key>
   SUPABASE_SERVICE_ROLE_KEY=<your service_role/secret key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   `NEXT_PUBLIC_SITE_URL` should be the URL the app runs at — `http://localhost:3000`
   while developing on your own machine, or your real domain once deployed.

3. In your Supabase project, go to **Authentication → URL Configuration**
   and add the same URL (plus `/auth/callback`, e.g.
   `http://localhost:3000/auth/callback`) to **Redirect URLs**. Without
   this, the sign-in link in emails won't work.

## 5b. Enable Google sign-in (optional)

The sign-in page has a **Continue with Google** button, already wired up
in the app — it just needs Google turned on in your Supabase project.

1. In [Supabase], go to **Authentication → Providers → Google** and open
   it. It shows a **Callback URL** — copy it (it looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`; this is
   Supabase's own callback, different from your app's `/auth/callback`).
2. In the [Google Cloud Console], create an **OAuth client ID**
   (Credentials → Create Credentials → OAuth client ID → Application
   type: Web application). Paste the Supabase callback URL from step 1
   into **Authorized redirect URIs**.
3. Copy the generated **Client ID** and **Client Secret**.
4. Back in Supabase's Google provider settings, toggle it **on**, paste
   the Client ID and Client Secret, and **Save**.

[Supabase]: https://supabase.com/dashboard
[Google Cloud Console]: https://console.cloud.google.com/apis/credentials

A Google sign-in still creates just a Supabase Auth account — like any
sign-in method, that person also needs a matching `people` row (same idea
as sections 7 / 7b) before they can actually get into the workspace. The
simplest path: invite them first via **Users and members → Invite** with
their Google email address, then have them click **Continue with Google**
instead of using the temporary password.

## 6. Set up the database

The app needs its schema (tables, security rules, calculation logic)
created in your Supabase project before it can show anything.

1. Open your Supabase project's **SQL Editor**.
2. Open each file in `supabase/migrations/` **in order** (`0001_...` through
   `0009_...`), paste its contents into the SQL editor, and run it. Each one
   must succeed before you run the next.
3. **Optional but recommended for your first run:** open `supabase/seed.sql`,
   paste it into the SQL editor, and run it. This creates a realistic demo
   portfolio (4 clients, 4 projects, a product, six hypercare services) so
   every screen has something to show immediately. Skip this step if you
   want to start with a completely empty workspace and enter your own data.

Full details, including a `psql` command-line alternative, are in
`supabase/README.md`.

## 7. Create your first user (workspace admin)

The app has no self-serve "sign up" — access is provisioned deliberately.
This manual, one-time step is only for the very first admin; everyone
after that is added from inside the app (see the next section).

1. In Supabase, go to **Authentication → Users** and click **Add user** →
   **Create new user**. Enter your email and set a password you'll
   remember — this is what you'll use to sign in. Tick "Auto Confirm User"
   so it's active immediately.
2. Copy the new user's **User UID**.
3. In the SQL Editor, run (replacing the placeholders):

   ```sql
   insert into people (workspace_id, auth_user_id, full_name, email, kind, avatar_initials, workspace_role)
   values (
     (select id from workspaces limit 1),
     '<the User UID you copied>',
     'Your Name',
     'you@example.com',
     'internal',
     'YN',
     'workspace_admin'
   );
   ```

   If you ran the seed script, a workspace already exists and `(select id
   from workspaces limit 1)` will find it. If you skipped the seed, first
   create a workspace: `insert into workspaces (name, slug) values ('My
   Workspace', 'my-workspace');`

## 7b. Add the rest of your team

Once you're signed in as a workspace admin, everyone else can be added
from the app itself — no more manual SQL.

1. In the sidebar, go to **Users and members**, then click **Invite**
   (`/people/invite`).
2. Fill in their name, email, role (`workspace_admin`, `member`, etc.) and
   kind (`internal` staff, or `client` for a portal-only user with a
   client tied to their account).
3. Submit. The app creates their Supabase Auth account and their `people`
   row in one step, and shows you a **temporary password** — this is
   shown only once, so copy it and send it to them securely (chat, not
   email, ideally).
4. They sign in at `/auth/sign-in` with their email and that temporary
   password, then should change it from **Settings → Change your
   password** (`/auth/set-password`).

Only a workspace admin can invite people — the invite page and its
underlying action both check this.

## 8. Run the app

```bash
npm run dev
```

Open the URL it prints (usually `http://localhost:3000`). You'll land on
the sign-in page, with:

- **Continue with Google** — if you enabled it in step 5b.
- **Email & password** (default tab) — enter the email and password you
  (or an admin) provisioned.
- **Magic link** (second tab) — enter your email and get a one-time
  sign-in link by email instead, no password needed.

Whichever you use, you'll be signed in and redirected into the workspace.

## 9. Around the app

- **Sidebar** — workspace-wide items at the top (Overview, Clients, Users
  and members, Templates, Notifications, Settings), then the three spaces.
  Click a space to expand its own navigation underneath. Opening a specific
  delivery project adds a fourth "PROJECT" section with that project's
  pages.
- **Header** — breadcrumb, search, notifications, and a "New" action.
- **A project page** — tabs across the top (Overview, Tasks, Flight plan
  check, Documents, Baselines, Change requests, Client updates, Client
  view config) all sit under one project.
- **Client view config → Publish** — nothing reaches the client portal or
  a public share link until you explicitly publish. Toggle sections on
  `client-view-config`, then click **Publish**; check the "last published"
  date on that page to confirm it worked.
- **Public share links** — created from a project's **Share links** page.
  Copy the link, or click Preview to see exactly what an outside viewer
  sees, with no login.
- **Client portal** — a signed-in client (a `people` row with
  `kind = 'client'` and a `client_roles` grant) lands at
  `/portal/<project-ref>` and sees a live, authenticated view with actions
  they can complete.

## 10. Deploying

This is a standard Next.js app — [Vercel](https://vercel.com) is the
simplest path (`vercel deploy` from the `web/` folder, or connect the repo
in the Vercel dashboard). Whichever host you use:

- Set the same environment variables as `.env.local` in the host's project
  settings.
- Set `NEXT_PUBLIC_SITE_URL` to your real production URL.
- Add `https://<your-domain>/auth/callback` to Supabase's Redirect URLs.

## 11. Troubleshooting

- **Every page redirects to sign-in in a loop, or nothing loads** — check
  that all three Supabase env vars are correct and that the migrations ran
  without error.
- **Sign-in email never arrives (magic link tab)** — check spam, and check
  that the redirect URL you added in Supabase matches
  `NEXT_PUBLIC_SITE_URL` exactly (including `http` vs `https`). Or just use
  the **Email & password** tab instead.
- **Forgot a temporary password, or the "Invite" button does nothing** —
  only a workspace admin can invite people; confirm the signed-in account
  has `workspace_role = 'workspace_admin'` in the `people` table. A lost
  temporary password can only be reset by an admin creating a new one for
  that user in Supabase's **Authentication → Users** (Reset password).
- **"Continue with Google" shows an error, or does nothing** — Google
  isn't enabled yet in this Supabase project; see step 5b. Double-check
  the Authorized redirect URI in Google Cloud matches the callback URL
  Supabase shows exactly.
- **Signed in, but every page says "not signed in, or this workspace has
  no data yet"** — your Supabase Auth user exists but has no matching row
  in the `people` table. Repeat step 7.
- **A page loads but is empty** — that's a genuine empty state (no data
  yet for that screen), not a bug — run `supabase/seed.sql` for demo data,
  or start creating real projects/clients/products from the UI.
