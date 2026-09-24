"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthResponse } from "@wordhunt/shared/user";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import styles from "../login/page.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const session = await apiFetch<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
      setSession(session);
      router.push("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  }

  return <div className={styles.page}>
    <div className={styles.right}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formHeader}><h2>Create account</h2><p>Already playing? <Link href="/login">Sign in</Link></p></div>
        <label className="label">Username<input className="input" value={form.username} onChange={set("username")} required minLength={3} maxLength={20} autoFocus /></label>
        <label className="label">Email<input className="input" type="email" value={form.email} onChange={set("email")} required /></label>
        <label className="label">Password<input className="input" type="password" value={form.password} onChange={set("password")} required minLength={8} /></label>
        {error && <p className={styles.error}>{error}</p>}
        <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
      </form>
    </div>
  </div>;
}
