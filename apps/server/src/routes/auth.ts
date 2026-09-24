import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getRankTier } from "@wordhunt/shared/game";
import { prisma } from "../db/prisma";
import { signAuthToken } from "../auth/jwt";

export const authRouter = Router();

const RegisterSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function sessionUser(user: { id: string; username: string; email: string; elo: number; wins: number; losses: number; draws: number }) {
  const decidedGames = user.wins + user.losses;
  return {
    ...user,
    tier: getRankTier(user.elo),
    winRate: decidedGames > 0 ? Math.round((user.wins / decidedGames) * 100) : 0,
  };
}

async function respondWithSession(res: Response, user: { id: string; username: string; email: string; elo: number; wins: number; losses: number; draws: number }) {
  const token = await signAuthToken(user.id, user.username);
  res.json({ token, user: sessionUser(user) });
}

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }

  const { username, email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: normalizedEmail }] },
  });

  if (existing) {
    const field = existing.username === username ? "Username" : "Email";
    res.status(409).json({ error: `${field} already taken` });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, email: normalizedEmail, passwordHash },
    select: { id: true, username: true, email: true, elo: true, wins: true, losses: true, draws: true },
  });

  res.status(201);
  await respondWithSession(res, user);
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const dummyHash = "$2a$12$7bQ6xYIP4M8vH0KOhM9HFu1QXoSTGbSPmYa61W32f4cQ1AygOKeZi";
  const matches = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? dummyHash);

  if (!user || !matches) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await respondWithSession(res, user);
});
