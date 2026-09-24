"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@wordhunt/shared/user";
import { useAuth } from "@/context/AuthContext";
import styles from "./Navbar.module.css";

export default function Navbar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  return <nav className={styles.nav}>
    <Link href="/" className={styles.logo}>word hunt</Link>
    <div className={styles.links}>
      {user && <Link href="/lobby" className={pathname === "/lobby" ? styles.active : ""}>play</Link>}
      <Link href="/leaderboard" className={pathname === "/leaderboard" ? styles.active : ""}>ranking</Link>
    </div>
    <div className={styles.right}>
      {user ? <div className={styles.authLinks}>
        <div className={styles.userChip}><div className={styles.avatar}>{user.username[0].toUpperCase()}</div><span className={styles.username}>{user.username}</span><span className={styles.elo}>{user.elo.toLocaleString()}</span></div>
        <button className="btn btn-secondary" onClick={() => { logout(); router.push("/login"); }}>sign out</button>
      </div> : <div className={styles.authLinks}><Link href="/login" className={styles.loginLink}>sign in</Link><Link href="/register" className="btn btn-primary">sign up</Link></div>}
    </div>
  </nav>;
}
