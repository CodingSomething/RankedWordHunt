import type { WordFound } from "@wordhunt/shared/game";
import styles from "./WordList.module.css";

interface WordListProps {
  words:       WordFound[];
  label?:      string;
  variant?:    "mine" | "opponent";
}

export default function WordList({ words, label = "Words found", variant = "mine" }: WordListProps) {
  const sorted = [...words].sort((a, b) => b.points - a.points);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>{words.length}</span>
      </div>

      <div className={styles.list}>
        {sorted.length === 0 ? (
          <span className={styles.empty}>none yet</span>
        ) : (
          sorted.map(w => (
            <div key={w.word} className={`${styles.word} ${variant === "opponent" ? styles.opponent : ""}`}>
              <span className={styles.wordText}>{w.word}</span>
              <span className={styles.points}>+{w.points.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
