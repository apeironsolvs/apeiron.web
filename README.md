# Apeiron Solutions: website, client accounts and admin website

Two websites in one Node server, sharing one SQLite database. **No npm dependencies** (Node 22.5+ built-ins only).

| Website | Address (local) | Folder | Who |
|---|---|---|---|
| Public website + client accounts | http://localhost:8080 | `site/` | visitors and clients |
| **Admin website** (separate) | http://localhost:8081 | `admin-site/` | Apeiron staff only |

## Run it locally
```
node -v                                  # must be 22.5 or newer
copy .env.example .env                   # (Mac/Linux: cp .env.example .env), then edit .env
npm install                              # installs @supabase/supabase-js
npm start
```
Open http://localhost:8080 for the site and http://localhost:8081 for the admin website.

## Supabase Cloud Database Setup
Apeiron connects directly to Supabase Cloud PostgreSQL via the official `@supabase/supabase-js` client.

1. **Create your database tables in Supabase:**
   - Log into your [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
   - Click **SQL Editor** in the left sidebar, then click **New Query**.
   - Open [supabase/schema.sql](file:///supabase/schema.sql), copy its entire contents, paste them into the SQL editor, and click **Run**.
2. **Add your Supabase credentials to `.env`:**
   - In Supabase, navigate to **Project Settings** (gear icon) -> **API**.
   - Copy your **Project URL** and the **service_role** secret API key.
   - In `.env`, set:
     ```env
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     DATABASE_BACKEND=supabase
     ```
3. **Verify your connection:**
   ```bash
   npm run test-supabase
   ```
   This will verify that all 10 tables, indexes, and Row Level Security policies are active.
4. *(Optional)* **Migrate existing local data:**
   If you have records in `data/apeiron.db`, push them to Supabase by running:
   ```bash
   npm run migrate-supabase
   ```

## First admin login
Put these two lines in your `.env`, start the site once, then **delete the `ADMIN_PASSWORD` line**. The site creates the admin with a hashed password (it is never stored in readable form):
```
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=a-password-of-12-or-more-characters
ADMIN_NOTIFY_EMAIL=your-admin-email      # optional: where new-request alerts are emailed (defaults to ADMIN_EMAIL)
```
Change the password later with `npm run create-admin -- your-admin-email`. **Never commit `.env`** and never write real passwords in code or docs.

## What clients do
1. **Bring your idea** (or Log in, top right) opens the **login window**: Log in, or **Create account** (name, email, password, and a required tick-box accepting the Terms and Conditions and the Privacy Policy). Passwords are stored hashed. Logins are remembered for 30 days. Forgot your password? A 6-digit code is emailed.
2. After login they land on **What do you want to build?** and type their idea.
3. The site analyses the words (keyword matching, not an AI model) and shows the **options it thinks they need** and why; they can choose several.
4. **Basic requirements** for each option (pre-ticked from their words).
5. Two ways to work with us: **Continue building with us** (build cost + monthly subscription fee) or **Just build, then leave** (build cost only).
6. **Review and send**: price breakdown, payment details, a note that they can negotiate, a comment box, **Send**, and a status beside it: **Pending** (red) until Apeiron approves, then **Accepted** (green), or **Rejected**.
7. They can follow it, reply and see replies on that page and on **Profile**, which also lets them edit their details or delete their account.

## What staff do (admin website)
Log in, see every request (client, options, plan, totals, comments), **Approve** or **Reject** (with an optional message), reply to comments, set the live project stage, and read support-chat messages. Each new request and comment is emailed to `ADMIN_NOTIFY_EMAIL`; the client is emailed when you approve, reject or reply.

## Email (needed for codes and alerts)
Until email is set up, in local mode codes and alerts are printed in the terminal; on a live server password reset is refused with a clear message. Set it up:
1. Gmail: turn on 2-Step Verification, create an *App password*, then fill `SMTP_USER`, `SMTP_PASS` (the app password) and `MAIL_FROM` in `.env`. (Or use Resend with `RESEND_API_KEY`.)
2. Restart `npm start`. The log warns "Email is not configured" if something is missing.

## Prices
Starting prices are placeholders in `server/pricing.js`. **Set your real prices there.** Prices are calculated only on the server.

## Test (run before every deploy)
```
npm test                                 # 41 backend, security and journey tests
pip install playwright && playwright install chromium
python tests/smoke.py                    # the whole journey in a real browser (73 checks)
```

## Deploy
Use a host that runs Node or Docker: `docker build -t apeiron . && docker run -p 8080:8080 -p 8081:8081 -v apeiron-data:/data --env-file .env apeiron`. Mount a persistent volume for `/data` and back it up (`npm run backup`). Put HTTPS in front. **Never expose the admin website openly**: set `ADMIN_ALLOWED_IPS` (your own IPs) and/or put it behind a firewall or VPN; ideally publish it on its own address such as admin.yourdomain.com. Set `NODE_ENV=production` only on the live server.

## Folders
`site/` public website, `admin-site/` admin website, `server/` API, `scripts/` tools (`create-admin`, `erase`, `backup`), `tests/`, `docs/` (rules, audit, architecture, memory; not published).

## Privacy requests
Clients can delete their own account on the Profile page. Staff can run `npm run erase -- person@example.com`.

## Before launch
Domain (`YOUR-DOMAIN.com`), real prices, legal details and lawyer review of the Terms and Privacy Policy (bump `TERMS_VERSION` in `server/legal.js` whenever they change), contact emails, real case studies and team, `ADMIN_ALLOWED_IPS`, email, backups. See `docs/SECURITY-AUDIT.md` and `docs/task.md`.
