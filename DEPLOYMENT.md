# Production deployment

Target architecture:

- **Vercel** — Next.js frontend
- **Railway** — Express + Socket.IO backend (one replica)
- **Supabase** — PostgreSQL database

The frontend never connects directly to Postgres. Browser traffic goes to Railway over HTTPS / Socket.IO, and Railway connects to Supabase through Prisma.

## 0. Put the project in GitHub

From the repository root:

```bash
git init
git add .
git commit -m "Prepare Word Hunt for production"
```

Create an empty GitHub repository and push this project to it. Do not commit `apps/server/.env` or `apps/web/.env.local`. Commit the `package-lock.json` that your local `npm install` generated so cloud builds use the same dependency graph.

Before pushing, run:

```bash
npm run words:setup
npm run typecheck
npm run test
```

`apps/server/data/words.txt` may be committed. The Railway production build also runs `words:ensure`, so it can generate the full dictionary if the file is absent.

## 1. Create the Supabase database

1. Create a Supabase project.
2. Save the database password.
3. In Supabase, click **Connect**.
4. Copy the **Session pooler** connection string (port `5432`).
5. Replace the password placeholder with your real database password. If the password contains reserved URL characters, percent-encode them.

You will use the complete string as Railway's `DATABASE_URL`.

Do not put the database URL in Vercel or in any `NEXT_PUBLIC_*` variable.

## 2. Deploy the backend to Railway

1. Create a Railway project and add a service from the GitHub repository.
2. Keep the service rooted at the repository root because the server depends on `packages/shared`.
3. In the Railway service settings, set:

```text
Build Command: npm run build:server:production
Pre-deploy Command: npm run db:deploy
Start Command: npm run start:server
Healthcheck Path: /health
```

Railway's old `railway.json` Config-as-Code flow is deprecated for new services, so these settings are intentionally configured in the service dashboard.

4. Add these Railway variables:

```text
DATABASE_URL=<Supabase Session Pooler URL>
JWT_SECRET=<long random secret>
CLIENT_URLS=http://localhost:3000
NODE_ENV=production
```

Generate the JWT secret locally with:

```bash
openssl rand -base64 48
```

5. Do **not** add a fixed `PORT`; Railway supplies it.
6. Keep the service at **one replica**.
7. Deploy. The pre-deploy step applies the committed Prisma migrations to Supabase.
8. Generate a Railway public domain for the service. Copy the HTTPS URL.
9. Open `<RAILWAY_URL>/health`. It should report:

```json
{
  "ok": true,
  "database": "connected"
}
```

The dictionary object should also report `full: true`.

Keep this backend at **one replica** for now. Matchmaking and live match state are stored in this server's memory. Multiple replicas require shared state / Redis first.

## 3. Deploy the frontend to Vercel

Import the same GitHub repository into Vercel. Configure the project as:

```text
Framework Preset: Next.js
Root Directory: apps/web
Install Command: cd ../.. && npm install
Build Command: cd ../.. && npm run build:web
Output Directory: leave the Next.js default
```

Add these Production environment variables:

```text
NEXT_PUBLIC_API_URL=<RAILWAY_HTTPS_URL>
NEXT_PUBLIC_SOCKET_URL=<RAILWAY_HTTPS_URL>
```

Both are intentionally public. They are URLs, not secrets. Vercel embeds `NEXT_PUBLIC_*` values into the browser build, so changing them requires a new deployment.

Deploy the frontend and copy its production HTTPS URL, for example:

```text
https://your-project.vercel.app
```

## 4. Allow the Vercel frontend in Railway

Go back to Railway and replace `CLIENT_URLS` with the actual Vercel production URL:

```text
CLIENT_URLS=https://your-project.vercel.app
```

If you later add a custom frontend domain, list both origins separated by commas:

```text
CLIENT_URLS=https://wordhunt.example.com,https://your-project.vercel.app
```

Redeploy/restart the Railway service after changing this variable.

## 5. Production smoke test

Use two separate browser sessions/devices and confirm:

1. Railway `/health` says the DB is connected and the full dictionary is loaded.
2. Register account A on the Vercel site.
3. Register account B in a private window or another device.
4. Queue both accounts.
5. Confirm both receive the same board.
6. Finish a match.
7. Confirm ELO and records update.
8. Refresh one player during a match and confirm reconnect/resume.
9. Close one player for longer than the reconnect grace period and confirm forfeit handling.
10. Check Supabase's Table Editor and confirm `User`, `Match`, `WordFound`, and `EloHistory` contain production data.

## 6. Production rules for this version

- Keep exactly one Railway backend replica.
- Do not expose `DATABASE_URL` or `JWT_SECRET` to the frontend.
- Do not prefix secrets with `NEXT_PUBLIC_`.
- Do not commit local `.env` files.
- Vercel preview URLs are separate origins. They will need to be explicitly added to `CLIENT_URLS` if you want preview deployments to connect to the production backend.
- Use a separate staging backend/database before allowing previews to write production data.

## Environment map

| Variable | Local | Railway | Vercel | Secret? |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | local Docker Postgres | Supabase URL | never | yes |
| `JWT_SECRET` | local secret | production secret | never | yes |
| `CLIENT_URLS` | `http://localhost:3000` | Vercel/custom domains | never | no |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | never | Railway URL | no |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | never | Railway URL | no |
| `PORT` | `3001` | supplied by Railway | never | no |
