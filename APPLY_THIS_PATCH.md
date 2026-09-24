# Apply this patch

From macOS Terminal, stop `npm run dev`, then merge this patch into your existing project with `ditto` so Finder does not replace whole folders.

Example:

```bash
ditto ~/Downloads/wordhunt_production_patch ~/Downloads/wordhunt_local_ready-2
cd ~/Downloads/wordhunt_local_ready-2
npm install
npm run typecheck
npm test
npm run dev
```

This patch does not change your Prisma schema or local Docker volume, so it does not erase your local users or matches.

After local verification, follow `DEPLOYMENT.md` for Supabase, Railway, and Vercel.
