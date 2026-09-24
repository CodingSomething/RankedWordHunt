import { Server, type Socket } from "socket.io";
import {
  EVENTS,
  type MatchAbandonedPayload,
  type MatchFoundPayload,
  type MatchOverPayload,
  type MatchResumedPayload,
  type WordSubmitPayload,
} from "@wordhunt/shared/socket-events";
import {
  MATCH_COUNTDOWN,
  MATCH_DURATION,
  RECONNECT_GRACE_SECONDS,
  type MatchResultPlayer,
} from "@wordhunt/shared/game";
import { prisma } from "../db/prisma";
import { verifyAuthToken } from "../auth/jwt";
import {
  calculateElo,
  generateBoard,
  isValidPath,
  isValidWord,
  pathToWord,
} from "../game/engine";
import {
  enqueue,
  dequeue,
  dequeueBySocket,
  tryDequeueMatch,
} from "./matchmaking";
import {
  bindSocketToUser,
  createGame,
  deleteGame,
  getGame,
  getGameBySocket,
  getGameByUser,
  opponentForUser,
  playerForUser,
  recordWord,
  serializeWords,
  unbindSocket,
  type GameState,
  type PlayerState,
} from "./game";

type MatchEndReason = "opponent_disconnected" | "both_disconnected" | undefined;

interface PersistedResult {
  winnerId: string | null;
  status: "FINISHED" | "ABANDONED";
  player1: MatchResultPlayer;
  player2: MatchResultPlayer;
  reason?: MatchEndReason;
}

export function registerSocketHandlers(io: Server): void {
  io.use(async (socket, next) => {
    const token = typeof socket.handshake.auth?.token === "string"
      ? socket.handshake.auth.token
      : null;

    if (!token) {
      next(new Error("unauthorized"));
      return;
    }

    try {
      const auth = await verifyAuthToken(token);
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, username: true, elo: true },
      });
      if (!user) {
        next(new Error("unauthorized"));
        return;
      }
      socket.data.user = user;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  let matchmakingBusy = false;
  const runMatchmaking = async () => {
    if (matchmakingBusy) return;
    matchmakingBusy = true;
    try {
      await attemptMatches(io);
    } finally {
      matchmakingBusy = false;
    }
  };

  const matchmakingTimer = setInterval(() => void runMatchmaking(), 1_000);
  matchmakingTimer.unref?.();

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as { id: string; username: string; elo: number };
    console.log(`[socket] connected ${socket.id} as ${user.username}`);

    socket.on(EVENTS.QUEUE_JOIN, async () => {
      if (getGameByUser(user.id)) {
        resumeMatch(io, socket, user.id);
        return;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, username: true, elo: true },
      });
      if (!currentUser || !socket.connected) return;
      socket.data.user = currentUser;

      const position = enqueue({
        socketId: socket.id,
        userId: currentUser.id,
        username: currentUser.username,
        elo: currentUser.elo,
        joinedAt: Date.now(),
      });
      socket.emit(EVENTS.QUEUE_JOINED, { position });
      void runMatchmaking();
    });

    socket.on(EVENTS.QUEUE_LEAVE, () => {
      dequeue(user.id);
      socket.emit(EVENTS.QUEUE_LEFT);
    });

    socket.on(EVENTS.MATCH_RESUME, () => {
      resumeMatch(io, socket, user.id);
    });

    socket.on(EVENTS.WORD_SUBMIT, (payload: WordSubmitPayload) => {
      handleWordSubmission(io, socket, user.id, payload);
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected ${socket.id} (${user.username})`);
      dequeueBySocket(socket.id);
      scheduleReconnectGrace(io, socket.id);
    });
  });
}

async function attemptMatches(io: Server): Promise<void> {
  while (true) {
    const pair = tryDequeueMatch();
    if (!pair) return;
    const [p1, p2] = pair;

    const p1AlreadyPlaying = getGameByUser(p1.userId);
    const p2AlreadyPlaying = getGameByUser(p2.userId);
    if (p1AlreadyPlaying || p2AlreadyPlaying) {
      if (!p1AlreadyPlaying && io.sockets.sockets.has(p1.socketId)) enqueue(p1);
      if (!p2AlreadyPlaying && io.sockets.sockets.has(p2.socketId)) enqueue(p2);
      continue;
    }

    if (!io.sockets.sockets.has(p1.socketId) || !io.sockets.sockets.has(p2.socketId)) {
      if (io.sockets.sockets.has(p1.socketId)) enqueue(p1);
      if (io.sockets.sockets.has(p2.socketId)) enqueue(p2);
      continue;
    }

    const matchId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const board = generateBoard();
    const startsAt = Date.now() + MATCH_COUNTDOWN * 1_000;
    const endsAt = startsAt + MATCH_DURATION * 1_000;

    try {
      await prisma.match.create({
        data: {
          id: matchId,
          board,
          status: "ACTIVE",
          startedAt: new Date(startsAt),
          endsAt: new Date(endsAt),
          player1Id: p1.userId,
          player2Id: p2.userId,
          player1EloBefore: p1.elo,
          player2EloBefore: p2.elo,
        },
      });
    } catch (error) {
      console.error(`[match] failed to create ${matchId}`, error);
      enqueue(p1);
      enqueue(p2);
      return;
    }

    const game: GameState = {
      matchId,
      board,
      player1: makePlayer(p1),
      player2: makePlayer(p2),
      startsAt,
      endsAt,
      tickInterval: null,
      startTimer: null,
      endTimer: null,
      finalizing: false,
    };

    createGame(game);

    emitMatchFound(io, game, game.player1, game.player2, 1);
    emitMatchFound(io, game, game.player2, game.player1, 2);

    game.startTimer = setTimeout(() => {
      emitToPlayer(io, game.player1, EVENTS.MATCH_START);
      emitToPlayer(io, game.player2, EVENTS.MATCH_START);
      emitTick(io, game);
      game.tickInterval = setInterval(() => emitTick(io, game), 1_000);
    }, Math.max(0, startsAt - Date.now()));

    game.endTimer = setTimeout(() => {
      void finishByScore(io, game.matchId);
    }, Math.max(0, endsAt - Date.now()));

    console.log(`[match] ${matchId}: ${p1.username} (${p1.elo}) vs ${p2.username} (${p2.elo})`);
  }
}

function makePlayer(entry: { socketId: string; userId: string; username: string; elo: number }): PlayerState {
  return {
    socketId: entry.socketId,
    userId: entry.userId,
    username: entry.username,
    elo: entry.elo,
    score: 0,
    wordsFound: new Map(),
    reconnectTimer: null,
  };
}

function emitMatchFound(
  io: Server,
  game: GameState,
  player: PlayerState,
  opponent: PlayerState,
  playerNumber: 1 | 2,
): void {
  if (!player.socketId) return;
  const payload: MatchFoundPayload = {
    matchId: game.matchId,
    board: game.board,
    playerNumber,
    startsAt: game.startsAt,
    endsAt: game.endsAt,
    opponent: { userId: opponent.userId, username: opponent.username, elo: opponent.elo },
  };
  io.to(player.socketId).emit(EVENTS.MATCH_FOUND, payload);
}

function emitTick(io: Server, game: GameState): void {
  const secondsLeft = Math.max(0, Math.ceil((game.endsAt - Date.now()) / 1_000));
  emitToPlayer(io, game.player1, EVENTS.MATCH_TICK, { secondsLeft });
  emitToPlayer(io, game.player2, EVENTS.MATCH_TICK, { secondsLeft });
}

function handleWordSubmission(io: Server, socket: Socket, userId: string, payload: WordSubmitPayload): void {
  const game = getGame(payload.matchId);
  const upper = payload.word.trim().toUpperCase();
  if (!game || game.finalizing) {
    socket.emit(EVENTS.WORD_REJECTED, { word: upper, reason: "match_over" });
    return;
  }

  const player = playerForUser(game, userId);
  const opponent = opponentForUser(game, userId);
  if (!player || !opponent || player.socketId !== socket.id) {
    socket.emit(EVENTS.WORD_REJECTED, { word: upper, reason: "not_in_match" });
    return;
  }

  const now = Date.now();
  if (now < game.startsAt) {
    socket.emit(EVENTS.WORD_REJECTED, { word: upper, reason: "not_started" });
    return;
  }
  if (now >= game.endsAt) {
    socket.emit(EVENTS.WORD_REJECTED, { word: upper, reason: "match_over" });
    void finishByScore(io, game.matchId);
    return;
  }

  if (player.wordsFound.has(upper)) {
    socket.emit(EVENTS.WORD_REJECTED, { word: upper, reason: "already_found" });
    return;
  }
  if (!isValidPath(payload.path) || pathToWord(game.board, payload.path).toUpperCase() !== upper) {
    socket.emit(EVENTS.WORD_REJECTED, { word: upper, reason: "invalid_path" });
    return;
  }
  if (!isValidWord(upper)) {
    socket.emit(EVENTS.WORD_REJECTED, { word: upper, reason: "invalid_word" });
    return;
  }

  const accepted = recordWord(player, upper);
  socket.emit(EVENTS.WORD_ACCEPTED, {
    word: accepted.word,
    points: accepted.points,
    totalScore: player.score,
  });
  emitToPlayer(io, opponent, EVENTS.OPPONENT_WORD, {
    points: accepted.points,
    opponentScore: player.score,
  });
}

function resumeMatch(io: Server, socket: Socket, userId: string): void {
  const game = getGameByUser(userId);
  if (!game || game.finalizing || Date.now() >= game.endsAt) return;

  const player = playerForUser(game, userId);
  const opponent = opponentForUser(game, userId);
  if (!player || !opponent) return;

  bindSocketToUser(game, userId, socket.id);
  const now = Date.now();
  const payload: MatchResumedPayload = {
    matchId: game.matchId,
    board: game.board,
    playerNumber: game.player1.userId === userId ? 1 : 2,
    startsAt: game.startsAt,
    endsAt: game.endsAt,
    phase: now < game.startsAt ? "countdown" : "playing",
    secondsLeft: Math.max(0, Math.ceil((game.endsAt - now) / 1_000)),
    myScore: player.score,
    opponentScore: opponent.score,
    myWords: serializeWords(player),
    opponent: { userId: opponent.userId, username: opponent.username, elo: opponent.elo },
  };

  socket.emit(EVENTS.MATCH_RESUMED, payload);
  emitToPlayer(io, opponent, EVENTS.OPPONENT_RECONNECTED, { matchId: game.matchId });
}

function scheduleReconnectGrace(io: Server, socketId: string): void {
  const game = getGameBySocket(socketId);
  if (!game || game.finalizing) return;
  const player = unbindSocket(game, socketId);
  if (!player) return;
  const opponent = opponentForUser(game, player.userId);
  if (!opponent) return;

  emitToPlayer(io, opponent, EVENTS.OPPONENT_DISCONNECTED, {
    matchId: game.matchId,
    graceSeconds: RECONNECT_GRACE_SECONDS,
  });

  player.reconnectTimer = setTimeout(() => {
    const current = getGame(game.matchId);
    if (!current || current.finalizing) return;
    const stillDisconnected = playerForUser(current, player.userId);
    if (!stillDisconnected || stillDisconnected.socketId) return;

    if (!current.player1.socketId && !current.player2.socketId) {
      void finishGame(io, current, "ABANDONED", null, "both_disconnected", null);
      return;
    }

    void finishGame(io, current, "ABANDONED", opponent.userId, "opponent_disconnected", player.userId);
  }, RECONNECT_GRACE_SECONDS * 1_000);
}

async function finishByScore(io: Server, matchId: string): Promise<void> {
  const game = getGame(matchId);
  if (!game || game.finalizing) return;
  const winnerId = game.player1.score > game.player2.score
    ? game.player1.userId
    : game.player2.score > game.player1.score
      ? game.player2.userId
      : null;
  await finishGame(io, game, "FINISHED", winnerId, undefined, null);
}

async function finishGame(
  io: Server,
  game: GameState,
  status: "FINISHED" | "ABANDONED",
  winnerId: string | null,
  reason: MatchEndReason,
  abandonedById: string | null,
): Promise<void> {
  if (game.finalizing) return;
  game.finalizing = true;

  try {
    const result = await persistResult(game, status, winnerId, reason, abandonedById);
    const event = status === "ABANDONED" ? EVENTS.MATCH_ABANDONED : EVENTS.MATCH_OVER;
    emitToPlayer(io, game.player1, event, result as MatchAbandonedPayload | MatchOverPayload);
    emitToPlayer(io, game.player2, event, result as MatchAbandonedPayload | MatchOverPayload);
    console.log(`[match] finished ${game.matchId} (${status}) winner=${winnerId ?? "draw/none"}`);
  } catch (error) {
    game.finalizing = false;
    console.error(`[match] failed to persist ${game.matchId}`, error);
    return;
  }

  deleteGame(game.matchId);
}

async function persistResult(
  game: GameState,
  status: "FINISHED" | "ABANDONED",
  winnerId: string | null,
  reason: MatchEndReason,
  abandonedById: string | null,
): Promise<PersistedResult> {
  const match = await prisma.match.findUnique({ where: { id: game.matchId } });
  if (!match || !match.player2Id || match.player2EloBefore === null) {
    throw new Error(`Match ${game.matchId} is missing persisted players`);
  }

  const player1Id = match.player1Id;
  const player2Id = match.player2Id;
  const player1EloBefore = match.player1EloBefore;
  const player2EloBefore = match.player2EloBefore;
  const shouldRate = status === "FINISHED" || winnerId !== null;
  const p1Outcome = winnerId === null
    ? 0.5
    : winnerId === player1Id
      ? 1
      : 0;

  const elo = shouldRate
    ? calculateElo(player1EloBefore, player2EloBefore, p1Outcome)
    : {
        newP1Elo: player1EloBefore,
        newP2Elo: player2EloBefore,
        p1Change: 0,
        p2Change: 0,
      };

  const wordData = [
    ...serializeWords(game.player1).map((entry) => ({
      matchId: game.matchId,
      userId: game.player1.userId,
      word: entry.word,
      score: entry.points,
      foundAt: new Date(entry.foundAt),
    })),
    ...serializeWords(game.player2).map((entry) => ({
      matchId: game.matchId,
      userId: game.player2.userId,
      word: entry.word,
      score: entry.points,
      foundAt: new Date(entry.foundAt),
    })),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: game.matchId },
      data: {
        status,
        finishedAt: new Date(),
        winnerId,
        abandonedById,
        player1Score: game.player1.score,
        player2Score: game.player2.score,
        player1EloAfter: elo.newP1Elo,
        player2EloAfter: elo.newP2Elo,
      },
    });

    if (wordData.length > 0) {
      await tx.wordFound.createMany({ data: wordData, skipDuplicates: true });
    }

    if (shouldRate) {
      const isDraw = winnerId === null;
      await tx.user.update({
        where: { id: player1Id },
        data: {
          elo: elo.newP1Elo,
          wins: { increment: winnerId === player1Id ? 1 : 0 },
          losses: { increment: winnerId === player2Id ? 1 : 0 },
          draws: { increment: isDraw ? 1 : 0 },
        },
      });
      await tx.user.update({
        where: { id: player2Id },
        data: {
          elo: elo.newP2Elo,
          wins: { increment: winnerId === player2Id ? 1 : 0 },
          losses: { increment: winnerId === player1Id ? 1 : 0 },
          draws: { increment: isDraw ? 1 : 0 },
        },
      });
      await tx.eloHistory.createMany({
        data: [
          { userId: player1Id, matchId: game.matchId, elo: elo.newP1Elo, change: elo.p1Change },
          { userId: player2Id, matchId: game.matchId, elo: elo.newP2Elo, change: elo.p2Change },
        ],
      });
    }
  });

  return {
    winnerId,
    status,
    reason,
    player1: {
      userId: player1Id,
      score: game.player1.score,
      eloBefore: player1EloBefore,
      eloAfter: elo.newP1Elo,
      eloChange: elo.p1Change,
    },
    player2: {
      userId: player2Id,
      score: game.player2.score,
      eloBefore: player2EloBefore,
      eloAfter: elo.newP2Elo,
      eloChange: elo.p2Change,
    },
  };
}

function emitToPlayer(io: Server, player: PlayerState, event: string, payload?: unknown): void {
  if (!player.socketId) return;
  io.to(player.socketId).emit(event, payload);
}
