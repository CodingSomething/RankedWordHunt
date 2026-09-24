"use client";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import GameBoard from "@/components/game/GameBoard";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import styles from "./page.module.css";

export default function GamePage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { match, submitWord, resetMatch, opponentDisconnected, wordFeedback } = useSocket();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
    else if (ready && user && !match) router.replace("/lobby");
  }, [ready, user, match, router]);

  const handlePlayAgain = useCallback(() => { resetMatch(); router.push("/lobby"); }, [resetMatch, router]);
  if (!user || !match) return null;

  if (match.phase === "countdown") {
    return <main className={styles.centered}>
      <p className={styles.versus}>{user.username} vs {match.opponent.username}</p>
      <p>Starting…</p>
    </main>;
  }

  if (match.phase === "finished") {
    const won = match.winnerId === user.id;
    const isDraw = match.winnerId === null;
    const result = match.result;
    return <main className={styles.finished}>
      <h1>{result?.status === "ABANDONED" && won ? "You won" : isDraw ? "Draw" : won ? "You won" : "You lost"}</h1>
      <p className={styles.finalScore}>{match.myScore} – {match.opponentScore}</p>
      {result && <p className={result.me.eloChange >= 0 ? styles.positive : styles.negative}>
        {result.me.eloChange >= 0 ? "+" : ""}{result.me.eloChange} ELO · {result.me.eloAfter.toLocaleString()} total
      </p>}
      <p className={styles.words}>{match.myWords.length ? match.myWords.map(w => w.word).join(", ") : "No words found."}</p>
      <div className={styles.actions}>
        <button className="btn btn-primary" onClick={handlePlayAgain}>Play again</button>
        <button className="btn" onClick={() => router.push("/lobby")}>Lobby</button>
      </div>
    </main>;
  }

  return <main className={styles.game}>
    <div className={styles.scoreLine}>
      <span>{user.username} {match.myScore}</span>
      <strong>{match.secondsLeft}s</strong>
      <span>{match.opponentScore} {match.opponent.username}</span>
    </div>
    {opponentDisconnected && <p className={styles.notice}>Opponent disconnected. Waiting 15 seconds.</p>}
    <GameBoard
      board={match.board.raw}
      wordsFound={match.myWords.map(w => w.word)}
      onWordFound={(word, path) => submitWord(word, path)}
      disabled={match.phase !== "playing"}
      feedback={wordFeedback}
    />
    <div className={styles.wordArea}>
      <span className={styles.wordLabel}>Words:</span>{" "}
      <span>{match.myWords.length ? match.myWords.map(w => w.word).join(", ") : "none yet"}</span>
    </div>
  </main>;
}
