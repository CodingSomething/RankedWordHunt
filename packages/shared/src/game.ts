export type RankTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type MatchStatus = "WAITING" | "ACTIVE" | "FINISHED" | "ABANDONED";
export type GamePhase = "idle" | "queuing" | "countdown" | "playing" | "finished";

export interface Board {
  raw: string;
  grid: string[][];
}

export interface WordFound {
  word: string;
  points: number;
  foundAt: number;
}

export interface MatchOpponent {
  userId: string;
  username: string;
  elo: number;
}

export interface MatchResultPlayer {
  userId: string;
  score: number;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
}

export interface LiveMatch {
  matchId: string;
  board: Board;
  playerNumber: 1 | 2;
  phase: GamePhase;
  startsAt: number;
  endsAt: number;
  secondsLeft: number;
  myScore: number;
  opponentScore: number;
  myWords: WordFound[];
  winnerId: string | null;
  opponent: MatchOpponent;
  result: {
    status: "FINISHED" | "ABANDONED";
    me: MatchResultPlayer;
    opponent: MatchResultPlayer;
    reason?: "opponent_disconnected" | "both_disconnected";
  } | null;
}

export const SCORE_TABLE: Record<number, number> = {
  3: 100,
  4: 400,
  5: 800,
  6: 1400,
  7: 1800,
  8: 2200,
};

export function scoreWord(word: string): number {
  const len = word.length;
  return SCORE_TABLE[len] ?? (len > 8 ? 2200 + (len - 8) * 400 : 0);
}

export const MATCH_DURATION = 80;
export const MATCH_COUNTDOWN = 3;
export const RECONNECT_GRACE_SECONDS = 15;

export function getRankTier(elo: number): RankTier {
  if (elo < 1100) return "Bronze";
  if (elo < 1300) return "Silver";
  if (elo < 1500) return "Gold";
  if (elo < 1700) return "Platinum";
  return "Diamond";
}

export const RANK_COLORS: Record<RankTier, string> = {
  Bronze: "#8f5a32",
  Silver: "#72716d",
  Gold: "#9a6b13",
  Platinum: "#426b70",
  Diamond: "#5e5578",
};
