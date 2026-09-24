import { getRankTier, RANK_COLORS } from "@wordhunt/shared/game";
import styles from "./RankBadge.module.css";

interface RankBadgeProps {
  elo: number;
  showElo?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function RankBadge({ elo, showElo = false, size = "md" }: RankBadgeProps) {
  const tier = getRankTier(elo);
  const color = RANK_COLORS[tier];

  return (
    <span className={`${styles.badge} ${styles[size]}`} style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
      {tier}
      {showElo && <span className={styles.elo}>{elo.toLocaleString()}</span>}
    </span>
  );
}
