import { Router, type Response } from "express";
import { getRankTier } from "@wordhunt/shared/game";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthRequest } from "../middleware/auth";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/me", async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, email: true, elo: true, wins: true, losses: true, draws: true },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const decidedGames = user.wins + user.losses;
  res.json({
    user: {
      ...user,
      tier: getRankTier(user.elo),
      winRate: decidedGames > 0 ? Math.round((user.wins / decidedGames) * 100) : 0,
    },
  });
});

userRouter.get("/me/matches", async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const parsedLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 20) : 10;

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
      status: { in: ["FINISHED", "ABANDONED"] },
    },
    orderBy: { finishedAt: "desc" },
    take: limit,
    include: {
      player1: { select: { id: true, username: true } },
      player2: { select: { id: true, username: true } },
      eloHistory: { where: { userId }, select: { change: true } },
    },
  });

  res.json({
    matches: matches.map((match) => {
      const isP1 = match.player1Id === userId;
      const opponent = isP1 ? match.player2 : match.player1;
      const myScore = isP1 ? match.player1Score : match.player2Score;
      const opponentScore = isP1 ? match.player2Score : match.player1Score;
      return {
        id: match.id,
        opponentUsername: opponent?.username ?? "Unknown",
        myScore,
        opponentScore,
        eloChange: match.eloHistory[0]?.change ?? 0,
        result: match.winnerId === null ? "draw" : match.winnerId === userId ? "win" : "loss",
        status: match.status,
        finishedAt: match.finishedAt,
      };
    }),
  });
});

userRouter.get("/me/elo-history", async (req: AuthRequest, res: Response) => {
  const history = await prisma.eloHistory.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { matchId: true, elo: true, change: true, createdAt: true },
  });
  res.json({ history });
});
