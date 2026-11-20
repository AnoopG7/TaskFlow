# Deploying TaskFlow

TaskFlow runs on three free services:

| Part | Host | Config in repo |
|---|---|---|
| Frontend (React + Vite) | Vercel | `vercel.json` |
| Backend (FastAPI) | Render | `render.yaml` |
| Database + auth | Supabase | `backend/db_schema.sql` |

Deploy in this order: **Supabase → Render → Vercel → wire the URLs together**. Each step needs a value from the one before it.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com), or open your existing one.
   If the dashboard says the project is **paused**, click **Restore project** and wait for it to come back (a few minutes).
2. **SQL Editor → New query**, paste `backend/db_schema.sql`, and run it. (Skip this if the tables already exist.)
3. **Project Settings → API** and copy these three values:
   - **Project URL**: this becomes `SUPABASE_URL`
   - **anon public** key: this becomes `SUPABASE_KEY`
   - **service_role** key: this becomes `SUPABASE_SERVICE_ROLE_KEY`. Keep it secret. It only goes on Render, never in the frontend.
4. **Authentication → Sign In / Providers → Email**. Either keep **Confirm email** on (users get a confirmation link), or turn it off for instant sign-up. The backend also tries to auto-confirm new users with the service key.
5. **Authentication → URL Configuration**. Fill this in after step 3, once you have the Vercel URL:
   - **Site URL**: `https://<your-app>.vercel.app`
   - **Redirect URLs**: add `https://<your-app>.vercel.app/**`

> Free Supabase projects pause after about 7 days without activity. If the app suddenly can't load anything, check the Supabase dashboard first.

## 2. Backend on Render

### Option A: Blueprint (recommended)

1. Push the repo to GitHub.
2. Render dashboard → **New → Blueprint** → connect the repo. Render reads `render.yaml` and proposes the `taskflow-api` service.
3. Fill in the secrets it prompts for:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Project URL from step 1 |
| `SUPABASE_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `GROQ_API_KEY` | from [console.groq.com](https://console.groq.com/keys) |
| `TELEGRAM_TOKEN` | from [@BotFather](https://t.me/BotFather). Leave it empty to run without the bot |
| `CORS_ORIGINS` | `https://<your-app>.vercel.app`. Use a placeholder for now and update it after step 3 |
| `CORS_ORIGIN_REGEX` | optional, see [Preview deployments](#preview-deployments) |
| `WEBHOOK_BASE_URL` | leave empty. Render's own `RENDER_EXTERNAL_URL` is used automatically |

4. Click **Apply**. The first build takes 2–4 minutes.

### Option B: Manual web service

Use these settings if you don't want a Blueprint:

| Setting | Value |
|---|---|
| Runtime | Python 3 |
| Root Directory | `backend` |
| Build Command | `pip install --upgrade pip && pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'` |
| Health Check Path | `/health` |
| Environment | the table above, plus `PYTHON_VERSION=3.12.6`, `ENVIRONMENT=production`, `DEBUG=false`, `GROQ_MODEL=openai/gpt-oss-120b` |

### Check it

```bash
curl https://taskflow-api.onrender.com/health
# {"status":"healthy", ..., "webhook_url":"https://taskflow-api.onrender.com/webhook/telegram"}
```

Interactive API docs are at `https://taskflow-api.onrender.com/docs`.

When `ENVIRONMENT=production` and `TELEGRAM_TOKEN` is set, the Telegram webhook registers itself on startup. To re-register it by hand:

```bash
curl -X POST https://taskflow-api.onrender.com/setup-webhook
```

### Free-tier sleep

Render's free web services sleep after 15 minutes without traffic, and the first request then takes 30–60 seconds. While the service sleeps, the scheduled morning brief, evening debrief and due-date reminders **do not run**.

To keep it awake, create a free monitor on [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) that requests `https://taskflow-api.onrender.com/health` every 10 minutes. One always-on service fits inside Render's 750 free instance hours a month.

## 3. Frontend on Vercel

1. Vercel dashboard → **Add New → Project** → import the repo.
2. Leave **Root Directory** as the repo root. `vercel.json` already points the install and build at `frontend/` and serves `frontend/dist`.
3. **Environment Variables** (Production and Preview):

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://taskflow-api.onrender.com`. No trailing slash, and no `/api` (the client adds it) |

4. Click **Deploy**. You'll get a URL like `https://taskflow-xyz.vercel.app`. To pick a nicer name, use **Settings → Domains**.

`vercel.json` also:
- rewrites every path to `index.html`, so deep links like `/projects/123` work on refresh;
- caches hashed `/assets/*` for a year;
- adds basic security headers;
- skips the build when a commit doesn't touch `frontend/` (`ignoreCommand`).

> `VITE_*` variables are baked in at build time. After changing `VITE_API_URL`, go to **Deployments → ⋯ → Redeploy**.

## 4. Wire the URLs together

1. **Render** → `taskflow-api` → **Environment** → set `CORS_ORIGINS` to your Vercel URL (comma-separate several, e.g. `https://taskflow.vercel.app,https://taskflow.dev`), then save. The service redeploys.
2. **Supabase** → Authentication → URL Configuration → set the Site URL and Redirect URLs to the Vercel URL (step 1.5).
3. Open the Vercel URL, create an account, and check:
   - **Today** loads and **New task** saves a task.
   - **Settings** shows your name, email and timezone; changing the name and saving updates the sidebar.
   - **Assistant** answers "What should I work on next?".
   - Telegram: put your chat ID in Settings, save, then message your bot.

### Preview deployments

Vercel gives every branch or PR its own URL. To let those call the API without listing each one, set this on Render:

```
CORS_ORIGIN_REGEX=^https://taskflow-[a-z0-9-]+-<your-vercel-scope>\.vercel\.app$
```

## Auto-deploys

Both hosts deploy on every push to `main`:
- **Render** rebuilds only when `backend/**` or `render.yaml` changes (`buildFilter`).
- **Vercel** rebuilds only when `frontend/**` or `vercel.json` changes (`ignoreCommand`).

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Build fails in `pydantic-core` / `maturin` with `Read-only file system` | Render picked its default Python (3.14), which has no prebuilt wheels for the pinned pydantic. `backend/.python-version` pins 3.12.6. If you override it, also set `PYTHON_VERSION=3.12.6` under **Environment**. |
| Browser console shows `CORS policy … blocked` | `CORS_ORIGINS` on Render doesn't exactly match the site's origin. Check `https`, the domain, and that there's no trailing slash. |
| Every page is empty, or the API logs show `Supabase connection failed` | The Supabase project is paused, or the keys are wrong. Restore the project and check the three `SUPABASE_*` values. |
| Requests go to `https://<vercel-app>/api/...` and return 404 | `VITE_API_URL` wasn't set when the site was built. Set it and redeploy. |
| The first request after a while takes ~1 minute | Render free-tier cold start. Add the uptime ping above. |
| Telegram bot doesn't reply | `curl …/health` should show a `webhook_url`; if it doesn't, check `TELEGRAM_TOKEN`, then `POST /setup-webhook`. The chat ID in Settings must match the one from @userinfobot. |
| Sign-up says "check your email" but no email arrives | Supabase's built-in mailer is rate-limited (a few emails an hour). Turn off **Confirm email**, or add custom SMTP under Authentication → Emails. |
