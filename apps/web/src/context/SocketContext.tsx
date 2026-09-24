"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { EVENTS, type MatchFoundPayload, type MatchOverPayload, type MatchResumedPayload, type MatchTickPayload, type OpponentWordPayload, type WordAcceptedPayload, type WordRejectedPayload } from "@wordhunt/shared/socket-events";
import type { LiveMatch, WordFound } from "@wordhunt/shared/game";
import { useAuth } from "./AuthContext";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

type WordFeedback = { word: string; accepted: boolean; points?: number; reason?: string; nonce: number } | null;

interface SocketContextValue {
  connected: boolean;
  queuing: boolean;
  queuePos: number | null;
  match: LiveMatch | null;
  opponentDisconnected: boolean;
  wordFeedback: WordFeedback;
  joinQueue: () => void;
  leaveQueue: () => void;
  submitWord: (word: string, path: number[]) => void;
  resetMatch: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

function toGrid(board: string): string[][] {
  return Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, col) => board[row * 4 + col]));
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user, refreshUser } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [queuePos, setQueuePos] = useState<number | null>(null);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [wordFeedback, setWordFeedback] = useState<WordFeedback>(null);

  useEffect(() => {
    if (!token || !user) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(EVENTS.MATCH_RESUME);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socket.on(EVENTS.QUEUE_JOINED, ({ position }: { position: number }) => { setQueuing(true); setQueuePos(position); });
    socket.on(EVENTS.QUEUE_LEFT, () => { setQueuing(false); setQueuePos(null); });

    const applyFound = (payload: MatchFoundPayload) => {
      setQueuing(false); setQueuePos(null); setOpponentDisconnected(false);
      setMatch({
        matchId: payload.matchId,
        board: { raw: payload.board, grid: toGrid(payload.board) },
        playerNumber: payload.playerNumber,
        phase: "countdown",
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        secondsLeft: Math.max(0, Math.ceil((payload.endsAt - Date.now()) / 1000)),
        myScore: 0,
        opponentScore: 0,
        myWords: [],
        winnerId: null,
        opponent: payload.opponent,
        result: null,
      });
    };
    socket.on(EVENTS.MATCH_FOUND, applyFound);
    socket.on(EVENTS.MATCH_RESUMED, (payload: MatchResumedPayload) => {
      setQueuing(false); setQueuePos(null); setOpponentDisconnected(false);
      setMatch({
        matchId: payload.matchId,
        board: { raw: payload.board, grid: toGrid(payload.board) },
        playerNumber: payload.playerNumber,
        phase: payload.phase,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        secondsLeft: payload.secondsLeft,
        myScore: payload.myScore,
        opponentScore: payload.opponentScore,
        myWords: payload.myWords,
        winnerId: null,
        opponent: payload.opponent,
        result: null,
      });
    });
    socket.on(EVENTS.MATCH_START, () => setMatch((prev) => prev ? { ...prev, phase: "playing" } : prev));
    socket.on(EVENTS.MATCH_TICK, ({ secondsLeft }: MatchTickPayload) => setMatch((prev) => prev ? { ...prev, secondsLeft } : prev));

    socket.on(EVENTS.WORD_ACCEPTED, ({ word, points, totalScore }: WordAcceptedPayload) => {
      const entry: WordFound = { word, points, foundAt: Date.now() };
      setWordFeedback({ word, accepted: true, points, nonce: Date.now() });
      setMatch((prev) => prev ? { ...prev, myScore: totalScore, myWords: [...prev.myWords, entry] } : prev);
    });
    socket.on(EVENTS.WORD_REJECTED, ({ word, reason }: WordRejectedPayload) => {
      setWordFeedback({ word, accepted: false, reason, nonce: Date.now() });
    });
    socket.on(EVENTS.OPPONENT_WORD, ({ opponentScore }: OpponentWordPayload) => setMatch((prev) => prev ? { ...prev, opponentScore } : prev));
    socket.on(EVENTS.OPPONENT_DISCONNECTED, () => setOpponentDisconnected(true));
    socket.on(EVENTS.OPPONENT_RECONNECTED, () => setOpponentDisconnected(false));

    const finish = (payload: MatchOverPayload) => {
      setOpponentDisconnected(false);
      setMatch((prev) => {
        if (!prev) return prev;
        const me = prev.playerNumber === 1 ? payload.player1 : payload.player2;
        const opponent = prev.playerNumber === 1 ? payload.player2 : payload.player1;
        return {
          ...prev,
          phase: "finished",
          winnerId: payload.winnerId,
          myScore: me.score,
          opponentScore: opponent.score,
          result: { status: payload.status, me, opponent, reason: payload.reason },
        };
      });
      void refreshUser();
    };
    socket.on(EVENTS.MATCH_OVER, finish);
    socket.on(EVENTS.MATCH_ABANDONED, finish);

    return () => { socket.disconnect(); socketRef.current = null; setConnected(false); };
  }, [token, user?.id, refreshUser]);

  const joinQueue = useCallback(() => socketRef.current?.emit(EVENTS.QUEUE_JOIN), []);
  const leaveQueue = useCallback(() => socketRef.current?.emit(EVENTS.QUEUE_LEAVE), []);
  const submitWord = useCallback((word: string, path: number[]) => {
    if (!match) return;
    socketRef.current?.emit(EVENTS.WORD_SUBMIT, { matchId: match.matchId, word, path });
  }, [match]);
  const resetMatch = useCallback(() => { setMatch(null); setWordFeedback(null); setOpponentDisconnected(false); }, []);

  const value = useMemo(() => ({ connected, queuing, queuePos, match, opponentDisconnected, wordFeedback, joinQueue, leaveQueue, submitWord, resetMatch }), [connected, queuing, queuePos, match, opponentDisconnected, wordFeedback, joinQueue, leaveQueue, submitWord, resetMatch]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const value = useContext(SocketContext);
  if (!value) throw new Error("useSocket must be used inside SocketProvider");
  return value;
}
