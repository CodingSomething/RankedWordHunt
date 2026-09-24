# Word Hunt — local-ready ranked multiplayer

This repository is the pre-deployment version of the ranked Word Hunt project. It is organized as an npm workspace with a Next.js client, Express/Socket.IO server, shared TypeScript contracts, Prisma, and PostgreSQL.

## Architecture

- `apps/web` — Next.js frontend on port 3000
- `apps/server` — Express + Socket.IO backend on port 3001
- `packages/shared` — event/game/user types shared by client and server
- PostgreSQL — local database on port 5432 (Docker Compose)
- `apps/server/data/words.txt` — installed server-side game dictionary

The server is authoritative for identity, matchmaking, match timing, word validation, score, winner selection, ELO changes, and persistence.

## Start locally

For a first-time setup:

```bash
npm install
npm run words:setup
npm run db:up
npm run db:migrate
npm run dev
```

See `LOCAL_SETUP.md` for the complete two-player test flow.

## Design direction

The UI uses a warm tabletop palette rather than a dashboard/SaaS treatment: cream surfaces, coral actions, muted teal support colors, tactile letter tiles, softer corners, and restrained shadows. The intent is playful and approachable without looking like a generic game template.


## Production deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the Supabase + Railway + Vercel deployment flow.
