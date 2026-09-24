"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./GameBoard.module.css";

function areAdjacent(a: number, b: number): boolean {
  const rowA = Math.floor(a / 4), colA = a % 4;
  const rowB = Math.floor(b / 4), colB = b % 4;
  return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1 && a !== b;
}
function validExtension(path: number[]): boolean {
  if (path.length < 2) return true;
  const last = path[path.length - 1], prev = path[path.length - 2];
  return !new Set(path.slice(0, -1)).has(last) && areAdjacent(prev, last);
}
function pathToWord(board: string, path: number[]): string { return path.map(i => board[i]).join(""); }

type Feedback = { word: string; accepted: boolean; points?: number; reason?: string; nonce: number } | null;
interface Props { board: string; wordsFound: string[]; onWordFound: (word: string, path: number[]) => void; disabled?: boolean; feedback?: Feedback; }

export default function GameBoard({ board, wordsFound, onWordFound, disabled = false, feedback = null }: Props) {
  const [path, setPath] = useState<number[]>([]);
  const [flash, setFlash] = useState<{ text: string; valid: boolean } | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>(Array(16).fill(null));
  const dragging = useRef(false);
  const foundSet = new Set(wordsFound.map(w => w.toUpperCase()));

  useEffect(() => {
    if (!feedback) return;
    const reasonText: Record<string, string> = { already_found: "already found", invalid_word: "not a word", invalid_path: "invalid path", not_started: "not started", match_over: "time's up", not_in_match: "match error" };
    setFlash({ text: feedback.accepted ? `+${feedback.points?.toLocaleString() ?? 0}` : (reasonText[feedback.reason ?? ""] ?? "rejected"), valid: feedback.accepted });
    const timer = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(timer);
  }, [feedback?.nonce]);

  const getCellAt = useCallback((x: number, y: number) => {
    for (let i = 0; i < 16; i++) {
      const el = cellRefs.current[i]; if (!el) continue;
      const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return null;
  }, []);
  const startDrag = useCallback((cell: number) => { if (!disabled) { dragging.current = true; setPath([cell]); } }, [disabled]);
  const moveDrag = useCallback((x: number, y: number) => {
    if (!dragging.current || disabled) return;
    const cell = getCellAt(x, y); if (cell === null) return;
    setPath(prev => { const idx = prev.indexOf(cell); if (idx !== -1) return prev.slice(0, idx + 1); const next = [...prev, cell]; return validExtension(next) ? next : prev; });
  }, [disabled, getCellAt]);
  const endDrag = useCallback(() => {
    if (!dragging.current) return; dragging.current = false;
    if (path.length >= 3) { const word = pathToWord(board, path).toUpperCase(); if (!foundSet.has(word)) onWordFound(word, [...path]); else setFlash({ text: "already found", valid: false }); }
    setPath([]);
  }, [path, board, foundSet, onWordFound]);
  const currentWord = path.length ? pathToWord(board, path).toUpperCase() : "";

  return <div className={styles.container}><div className={styles.wordDisplay}>{flash ? <span className={flash.valid ? styles.flashValid : styles.flashInvalid}>{flash.text}</span> : <span className={styles.currentWord}>{currentWord || <span className={styles.placeholder}>drag to form a word</span>}</span>}</div>
    <div className={styles.grid} onMouseMove={e => moveDrag(e.clientX,e.clientY)} onMouseUp={endDrag} onMouseLeave={endDrag} onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX,e.touches[0].clientY); }} onTouchEnd={endDrag}>
      {board.split("").map((letter,i) => { const idx = path.indexOf(i), inPath = idx !== -1; return <div key={i} ref={el => { cellRefs.current[i] = el; }} className={[styles.cell,inPath?styles.cellActive:"",idx===0?styles.cellStart:"",idx===path.length-1&&path.length?styles.cellHead:"",disabled?styles.cellDisabled:""].join(" ")} onMouseDown={e => {e.preventDefault();startDrag(i);}} onTouchStart={e => {e.preventDefault();startDrag(i);}}><span className={styles.letter}>{letter}</span>{inPath && <span className={styles.pathIndex}>{idx+1}</span>}</div>; })}
    </div></div>;
}
