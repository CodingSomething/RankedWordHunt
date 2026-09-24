"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import type { LeaderboardEntry, LeaderboardResponse } from "@wordhunt/shared/user";
import styles from "./page.module.css";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<LeaderboardResponse>("/api/leaderboard?limit=50")
      .then(d => setEntries(d.leaderboard))
      .finally(() => setLoading(false));
  }, []);

  return <main className={styles.main}>
    <Link className={styles.back} href={user ? "/lobby" : "/login"}>← back</Link>
    <h1>Ranking</h1>
    {loading ? <p>Loading…</p> : <table className={styles.table}>
      <thead><tr><th>#</th><th>Player</th><th>ELO</th><th>Record</th></tr></thead>
      <tbody>{entries.map(p => <tr key={p.id} className={p.id === user?.id ? styles.me : ""}>
        <td>{p.rank}</td>
        <td>{p.username}{p.id === user?.id ? " (you)" : ""}</td>
        <td>{p.elo.toLocaleString()}</td>
        <td>{p.wins}-{p.losses}-{p.draws}</td>
      </tr>)}</tbody>
    </table>}
    {!loading && entries.length === 0 && <p>No players yet.</p>}
  </main>;
}
