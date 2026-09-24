import type { MatchResultPlayer, WordFound } from "./game";

export const EVENTS = {
  QUEUE_JOIN: "queue:join",
  QUEUE_JOINED: "queue:joined",
  QUEUE_LEAVE: "queue:leave",
  QUEUE_LEFT: "queue:left",

  MATCH_FOUND: "match:found",
  MATCH_RESUME: "match:resume",
  MATCH_RESUMED: "match:resumed",
  MATCH_START: "match:start",
  MATCH_TICK: "match:tick",
  MATCH_OVER: "match:over",
  MATCH_ABANDONED: "match:abandoned",
  OPPONENT_DISCONNECTED: "opponent:disconnected",
  OPPONENT_RECONNECTED: "opponent:reconnected",

  WORD_SUBMIT: "word:submit",
  WORD_ACCEPTED: "word:accepted",
  WORD_REJECTED: "word:rejected",
  OPPONENT_WORD: "opponent:word",
} as const;

export interface QueueJoinedPayload {
  position: number;
}

export interface MatchFoundPayload {
  matchId: string;
  board: string;
  playerNumber: 1 | 2;
  startsAt: number;
  endsAt: number;
  opponent: { userId: string; username: string; elo: number };
}

export interface MatchResumedPayload extends MatchFoundPayload {
  phase: "countdown" | "playing";
  secondsLeft: number;
  myScore: number;
  opponentScore: number;
  myWords: WordFound[];
}

export interface MatchTickPayload {
  secondsLeft: number;
}

export interface MatchOverPayload {
  matchId: string;
  winnerId: string | null;
  status: "FINISHED" | "ABANDONED";
  player1: MatchResultPlayer;
  player2: MatchResultPlayer;
  reason?: "opponent_disconnected" | "both_disconnected";
}

export interface MatchAbandonedPayload extends MatchOverPayload {
  status: "ABANDONED";
}

export interface OpponentDisconnectedPayload {
  matchId: string;
  graceSeconds: number;
}

export interface OpponentReconnectedPayload {
  matchId: string;
}

export interface WordSubmitPayload {
  matchId: string;
  word: string;
  path: number[];
}

export interface WordAcceptedPayload {
  word: string;
  points: number;
  totalScore: number;
}

export interface WordRejectedPayload {
  word: string;
  reason:
    | "already_found"
    | "invalid_word"
    | "invalid_path"
    | "not_started"
    | "match_over"
    | "not_in_match";
}

export interface OpponentWordPayload {
  points: number;
  opponentScore: number;
}
