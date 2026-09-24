# Local setup

## 1. Install prerequisites

You need Node.js 20+ and a local PostgreSQL instance. The easiest path on macOS/Windows is Docker Desktop because this repo already includes `docker-compose.yml`.

## 2. Install JavaScript dependencies

From the repository root:

```bash
npm install
```

## 3. Install the full game dictionary

```bash
npm run words:setup
```

This downloads the public-domain ENABLE word-game lexicon, keeps alphabetic words from 3 through 16 letters, applies your local allow/block overrides, and writes the final dictionary to `apps/server/data/words.txt`.

You can edit:

- `apps/server/data/words-allow.txt` to add exceptions
- `apps/server/data/words-block.txt` to reject exceptions

After editing either file, rerun `npm run words:setup` and restart the server.

## 4. Start PostgreSQL

With Docker Desktop running:

```bash
npm run db:up
```

The local database settings are:

- host: `localhost`
- port: `5432`
- database: `wordhunt`
- user: `wordhunt`
- password: `wordhunt_dev`

`apps/server/.env` is already configured for those local-only credentials.

## 5. Create the schema

```bash
npm run db:migrate
```

This runs Prisma migrations against the local PostgreSQL database and generates Prisma Client.

Optional database viewer:

```bash
npm run db:studio
```

## 6. Start frontend + backend

```bash
npm run dev
```

Open:

- frontend: http://localhost:3000
- backend health check: http://localhost:3001/health

A healthy backend should report both PostgreSQL and the dictionary. After `npm run words:setup`, `dictionary.full` should be `true`:

```json
{
  "ok": true,
  "database": "connected",
  "dictionary": {
    "source": "installed game word list",
    "count": 100000,
    "path": ".../apps/server/data/words.txt",
    "full": true
  }
}
```

The count above is only an example; use the value returned by your server.

## 7. Test two real local players

1. Open `http://localhost:3000/register` in your normal browser window.
2. Create player A.
3. Open a private/incognito window at the same URL.
4. Create player B with a different email and username.
5. Press **Find match** for both players.
6. Both should receive the exact same board and enter the match after the countdown.
7. Play until the 80-second timer ends.
8. Confirm both clients show opposite outcomes, the same final scores, and ELO changes.
9. Return to the lobby and confirm the recent match appears.
10. Open the leaderboard and confirm the new ratings are visible.

## 8. Test reconnect behavior

During a match, refresh one player's page. The Socket.IO client reconnects using the saved JWT and sends `match:resume`. If the player returns within 15 seconds, the server restores the active board, scores, words, and remaining time. If they stay disconnected longer, the opponent wins by forfeit.

## 9. Useful commands

```bash
npm run words:setup
npm run test
npm run typecheck
npm run build
npm run db:studio
npm run db:down
```

## Dictionary note

The code intentionally does not bundle the official Collins Scrabble word list. Official tournament lists are copyrighted/licensed datasets. If you later acquire a license for a different lexicon, the server can use it without game-logic changes: replace `apps/server/data/words.txt` with a newline-delimited word list or set `WORD_LIST_PATH`.

## What is intentionally not production-ready yet

This is designed to be a strong local starting point before deployment. Before a public ranked launch, still add production secrets, HTTPS origins, rate limiting, abuse controls, logging/monitoring, and eventually Redis if you run more than one Socket.IO server instance.

JWTs are currently kept in `localStorage` for straightforward local development. For a hardened production authentication design, consider moving the REST session to secure HTTP-only cookies and designing the cross-origin Socket.IO authentication flow accordingly.
