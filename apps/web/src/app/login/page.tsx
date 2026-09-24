"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthResponse } from "@wordhunt/shared/user";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const session = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(session);
      router.push("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally { setLoading(false); }
  }

  return <div className={styles.page}>
    <div className={styles.right}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formHeader}><h2>Sign in</h2><p>New here? <Link href="/register">Create an account</Link></p></div>
        <label className="label">Email<input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></label>
        <label className="label">Password<input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {error && <p className={styles.error}>{error}</p>}
        <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  </div>;
}
