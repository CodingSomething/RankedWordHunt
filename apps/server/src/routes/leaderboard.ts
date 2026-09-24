import { Router, type Request, type Response } from "express";
import { getRankTier } from "@wordhunt/shared/game";
import { prisma } from "../db/prisma";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", async (req: Request, res: Response) => {
  const parsedLimit = Number.parseInt(String(req.query.limit ?? "50"), 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;

  const players = await prisma.user.findMany({
    orderBy: [{ elo: "desc" }, { username: "asc" }],
    take: limit,
    select: { id: true, username: true, elo: true, wins: true, losses: true, draws: true },
  });

  res.json({
    leaderboard: players.map((player, index) => {
      const decidedGames = player.wins + player.losses;
      return {
        rank: index + 1,
        ...player,
        tier: getRankTier(player.elo),
        winRate: decidedGames > 0 ? Math.round((player.wins / decidedGames) * 100) : 0,
      };
    }),
  });
});
