import type { RankTier } from "./game";

export interface User {
  id: string;
  username: string;
  email: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface SessionUser extends User {
  tier: RankTier;
  winRate: number;
}

export interface PublicUser {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  tier: RankTier;
  winRate: number;
}

export interface EloHistoryEntry {
  elo: number;
  change: number;
  matchId: string;
  createdAt: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
}

export interface LeaderboardEntry extends PublicUser {
  rank: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}
