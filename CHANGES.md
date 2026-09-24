# Changes made for the pre-deployment baseline

1. Converted the upload into a clean npm-workspace monorepo.
2. Added missing frontend package, TypeScript, and Next.js configuration.
3. Added a Docker Compose PostgreSQL service and Prisma migration workflow.
4. Added explicit frontend API routing to the Express backend URL.
5. Added shared auth state and persistent Socket.IO state above route navigation.
6. Registration/login now return and persist a JWT session.
7. Socket.IO authenticates the JWT and loads identity/ELO from PostgreSQL; clients no longer send trusted `userId` or ELO values.
8. Removed client-authoritative match finishing and the nonexistent `/api/match/finish` call.
9. Fixed ELO draws using a 0 / 0.5 / 1 result model.
10. Added server-authoritative `startsAt`/`endsAt` checks to prevent early/late word submissions.
11. Added 15-second disconnect/reconnect grace and `match:resume` state restoration.
12. Reworked matchmaking to prefer nearby ELO ratings and widen the allowed range while players wait.
13. Added wins/losses/draws and before/after ELO audit fields to the database schema.
14. Added a database-aware `/health` endpoint and graceful Prisma shutdown.
15. Removed client dictionary authority: the server decides whether a submitted path is a valid word.
16. Kept the simpler, paper-and-letter-tile visual redesign from the previous pass.
17. Added server tests for ELO and matchmaking behavior.

## September 2026 visual + dictionary pass

- Reworked the visual system away from hard black rules and square dashboard cards.
- Added a warm cream/coral/teal/butter palette and softer surface/shadow system.
- Redesigned the login/register hero around tactile WORD tiles.
- Softened the navbar, lobby, leaderboard, scoreboard, word panels, results, and live board.
- Made letter tiles larger, rounder, more tactile, and less uniformly "UI component"-like.
- Added `npm run words:setup` for a full public-domain ENABLE game dictionary.
- Added `words-allow.txt` and `words-block.txt` for game-specific dictionary corrections.
- Added dictionary status/count to `/health` so it is obvious when the server is still using the small fallback list.
- Made the server dictionary path swappable with `WORD_LIST_PATH` for a future licensed lexicon.
