import styles from "./Scoreboard.module.css";

interface ScoreboardProps {
  myUsername:       string;
  myScore:          number;
  opponentUsername: string;
  opponentScore:    number;
  secondsLeft:      number;
}

export default function Scoreboard({
  myUsername, myScore,
  opponentUsername, opponentScore,
  secondsLeft,
}: ScoreboardProps) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const isUrgent = secondsLeft <= 10;

  return (
    <div className={styles.scoreboard}>
      <div className={styles.player}>
        <div className={styles.playerName}>{myUsername}</div>
        <div className={styles.score}>{myScore.toLocaleString()}</div>
      </div>

      <div className={`${styles.timer} ${isUrgent ? styles.urgent : ""}`}>
        {mins}:{secs}
      </div>

      <div className={`${styles.player} ${styles.right}`}>
        <div className={styles.playerName}>{opponentUsername}</div>
        <div className={styles.score}>{opponentScore.toLocaleString()}</div>
      </div>
    </div>
  );
}
