import { scoreWord } from "../game/engine";
import type { WordFound } from "@wordhunt/shared/game";

export interface PlayerState {
  socketId: string | null;
  userId: string;
  username: string;
  elo: number;
  score: number;
  wordsFound: Map<string, WordFound>;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

export interface GameState {
  matchId: string;
  board: string;
  player1: PlayerState;
  player2: PlayerState;
  startsAt: number;
  endsAt: number;
  tickInterval: ReturnType<typeof setInterval> | null;
  startTimer: ReturnType<typeof setTimeout> | null;
  endTimer: ReturnType<typeof setTimeout> | null;
  finalizing: boolean;
}

const games = new Map<string, GameState>();
const socketToMatch = new Map<string, string>();
const userToMatch = new Map<string, string>();

export function createGame(state: GameState): void {
  games.set(state.matchId, state);
  userToMatch.set(state.player1.userId, state.matchId);
  userToMatch.set(state.player2.userId, state.matchId);
  if (state.player1.socketId) socketToMatch.set(state.player1.socketId, state.matchId);
  if (state.player2.socketId) socketToMatch.set(state.player2.socketId, state.matchId);
}

export function getGame(matchId: string): GameState | undefined {
  return games.get(matchId);
}

export function getGameBySocket(socketId: string): GameState | undefined {
  const matchId = socketToMatch.get(socketId);
  return matchId ? games.get(matchId) : undefined;
}

export function getGameByUser(userId: string): GameState | undefined {
  const matchId = userToMatch.get(userId);
  return matchId ? games.get(matchId) : undefined;
}

export function playerForUser(game: GameState, userId: string): PlayerState | null {
  if (game.player1.userId === userId) return game.player1;
  if (game.player2.userId === userId) return game.player2;
  return null;
}

export function opponentForUser(game: GameState, userId: string): PlayerState | null {
  if (game.player1.userId === userId) return game.player2;
  if (game.player2.userId === userId) return game.player1;
  return null;
}

export function bindSocketToUser(game: GameState, userId: string, socketId: string): boolean {
  const player = playerForUser(game, userId);
  if (!player) return false;

  if (player.socketId) socketToMatch.delete(player.socketId);
  player.socketId = socketId;
  socketToMatch.set(socketId, game.matchId);

  if (player.reconnectTimer) {
    clearTimeout(player.reconnectTimer);
    player.reconnectTimer = null;
  }
  return true;
}

export function unbindSocket(game: GameState, socketId: string): PlayerState | null {
  const player = game.player1.socketId === socketId
    ? game.player1
    : game.player2.socketId === socketId
      ? game.player2
      : null;
  if (!player) return null;
  socketToMatch.delete(socketId);
  player.socketId = null;
  return player;
}

export function serializeWords(player: PlayerState): WordFound[] {
  return [...player.wordsFound.values()].sort((a, b) => a.foundAt - b.foundAt);
}

export function recordWord(player: PlayerState, word: string): WordFound {
  const entry: WordFound = { word, points: scoreWord(word), foundAt: Date.now() };
  player.wordsFound.set(word, entry);
  player.score += entry.points;
  return entry;
}

export function deleteGame(matchId: string): void {
  const game = games.get(matchId);
  if (!game) return;

  if (game.tickInterval) clearInterval(game.tickInterval);
  if (game.startTimer) clearTimeout(game.startTimer);
  if (game.endTimer) clearTimeout(game.endTimer);
  if (game.player1.reconnectTimer) clearTimeout(game.player1.reconnectTimer);
  if (game.player2.reconnectTimer) clearTimeout(game.player2.reconnectTimer);

  if (game.player1.socketId) socketToMatch.delete(game.player1.socketId);
  if (game.player2.socketId) socketToMatch.delete(game.player2.socketId);
  userToMatch.delete(game.player1.userId);
  userToMatch.delete(game.player2.userId);
  games.delete(matchId);
}

export function activeGameCount(): number {
  return games.size;
}
