"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

interface MatchRecord {
  id: string;
  opponentUsername: string;
  myScore: number;
  opponentScore: number;
  eloChange: number;
  result: "win" | "loss" | "draw";
  status: "FINISHED" | "ABANDONED";
}

export default function LobbyPage() {
  const router = useRouter();
  const { user, token, ready, logout } = useAuth();
  const { connected, queuing, queuePos, match, joinQueue, leaveQueue } = useSocket();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  useEffect(() => {
    if (match && match.phase !== "finished") router.push("/game");
  }, [match, router]);

  if (!user) return null;

  return <main className={styles.main}>
    <h1>Word Hunt</h1>
    <p className={styles.account}>{user.username} · {user.elo.toLocaleString()} ELO · {user.wins}-{user.losses}-{user.draws}</p>

    <div className={styles.play}>
      {queuing ? <>
        <p className={styles.queueText}>Finding a match{queuePos ? ` · ${queuePos} in queue` : ""}…</p>
        <button className="btn" onClick={leaveQueue}>Cancel</button>
      </> : <button className="btn btn-primary btn-lg" onClick={joinQueue} disabled={!connected}>
        {connected ? "Find match" : "Connecting…"}
      </button>}
    </div>

    <section className={styles.recent}>
      <h2>Recent matches</h2>
      <RecentMatches token={token} />
    </section>

    <div className={styles.links}>
      <Link href="/leaderboard">Ranking</Link>
      <button onClick={() => { logout(); router.push("/login"); }}>Sign out</button>
    </div>
  </main>;
}

function RecentMatches({ token }: { token: string | null }) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ matches: MatchRecord[] }>("/api/user/me/matches?limit=5", {}, token)
      .then(data => setMatches(data.matches ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className={styles.empty}>Loading…</p>;
  if (!matches.length) return <p className={styles.empty}>No matches yet.</p>;

  return <div>{matches.map(match => <div key={match.id} className={styles.matchRow}>
    <span>vs {match.opponentUsername}</span>
    <span>{match.myScore}–{match.opponentScore}</span>
    <span className={match.eloChange > 0 ? styles.positive : match.eloChange < 0 ? styles.negative : styles.muted}>
      {match.eloChange > 0 ? "+" : ""}{match.eloChange}
    </span>
  </div>)}</div>;
}
