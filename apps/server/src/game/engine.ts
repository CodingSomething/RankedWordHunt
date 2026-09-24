import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { MATCH_DURATION, scoreWord } from "@wordhunt/shared/game";

export { MATCH_DURATION, scoreWord };

const LETTER_POOL = (
  "AAAAAAAAABBCCDDDDEEEEEEEEEEEEFFGGGHHIIIIIIIIIJKLLLLMM" +
  "NNNNNNOOOOOOOOOPPQRRRRRRSSSSTTTTTTUUUUVVWWXYYZ"
).split("");

export function generateBoard(): string {
  const pool = [...LETTER_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 16).join("");
}

let WORD_SET: Set<string> | null = null;
let WORD_LIST_INFO: WordListInfo = { source: "not loaded", count: 0, path: null, full: false };

export interface WordListInfo {
  source: string;
  count: number;
  path: string | null;
  full: boolean;
}

function normalizeWordList(text: string): Set<string> {
  return new Set(
    text
      .split(/\r?\n/)
      .map((word) => word.trim().replace(/^"|"$/g, "").toUpperCase())
      .filter((word) => /^[A-Z]+$/.test(word))
      .filter((word) => word.length >= 3 && word.length <= 16),
  );
}

function wordListCandidates(): Array<{ path: string; source: string; full: boolean }> {
  const custom = process.env.WORD_LIST_PATH;
  const candidates: Array<{ path: string; source: string; full: boolean }> = [];
  if (custom) candidates.push({ path: resolve(process.cwd(), custom), source: "custom word list", full: true });
  candidates.push(
    { path: resolve(process.cwd(), "data/words.txt"), source: "installed game word list", full: true },
    { path: resolve(process.cwd(), "apps/server/data/words.txt"), source: "installed game word list", full: true },
    { path: resolve(process.cwd(), "data/words-dev.txt"), source: "development fallback", full: false },
    { path: resolve(process.cwd(), "apps/server/data/words-dev.txt"), source: "development fallback", full: false },
    { path: resolve(process.cwd(), "words.txt"), source: "legacy development word list", full: false },
    { path: resolve(process.cwd(), "apps/server/words.txt"), source: "legacy development word list", full: false },
  );
  return candidates;
}

export function loadWordList(): WordListInfo {
  if (WORD_SET) return WORD_LIST_INFO;

  for (const candidate of wordListCandidates()) {
    if (!existsSync(candidate.path)) continue;
    const words = normalizeWordList(readFileSync(candidate.path, "utf-8"));
    if (words.size === 0) continue;
    WORD_SET = words;
    WORD_LIST_INFO = { source: candidate.source, count: words.size, path: candidate.path, full: candidate.full };
    console.log(`Word list loaded: ${words.size.toLocaleString()} words (${candidate.source})`);
    if (!candidate.full) console.warn("Using the small development dictionary. Run `npm run words:setup` from the repository root for the full game dictionary.");
    return WORD_LIST_INFO;
  }

  WORD_SET = new Set(["CAT", "DOG", "RUN", "SUN", "WORD", "HUNT", "GAME"]);
  WORD_LIST_INFO = { source: "emergency fallback", count: WORD_SET.size, path: null, full: false };
  console.warn("No word-list file found — using emergency fallback words only");
  return WORD_LIST_INFO;
}

export function getWordListInfo(): WordListInfo {
  if (!WORD_SET) loadWordList();
  return WORD_LIST_INFO;
}

export function isValidWord(word: string): boolean {
  if (!WORD_SET) loadWordList();
  return WORD_SET!.has(word.toUpperCase());
}

function areAdjacent(a: number, b: number): boolean {
  const rowA = Math.floor(a / 4);
  const colA = a % 4;
  const rowB = Math.floor(b / 4);
  const colB = b % 4;
  return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1 && a !== b;
}

export function isValidPath(path: number[]): boolean {
  if (path.length < 3) return false;
  const seen = new Set<number>();
  for (let i = 0; i < path.length; i++) {
    if (!Number.isInteger(path[i]) || path[i] < 0 || path[i] > 15) return false;
    if (seen.has(path[i])) return false;
    seen.add(path[i]);
    if (i > 0 && !areAdjacent(path[i - 1], path[i])) return false;
  }
  return true;
}

export function pathToWord(board: string, path: number[]): string {
  return path.map((index) => board[index]).join("");
}

const K = 32;
export type EloScore = 0 | 0.5 | 1;

export interface EloResult {
  newP1Elo: number;
  newP2Elo: number;
  p1Change: number;
  p2Change: number;
}

export function calculateElo(p1Elo: number, p2Elo: number, p1Score: EloScore): EloResult {
  const expected1 = 1 / (1 + Math.pow(10, (p2Elo - p1Elo) / 400));
  const expected2 = 1 - expected1;
  const p2Score = (1 - p1Score) as EloScore;
  const p1Change = Math.round(K * (p1Score - expected1));
  const p2Change = Math.round(K * (p2Score - expected2));
  return {
    newP1Elo: p1Elo + p1Change,
    newP2Elo: p2Elo + p2Change,
    p1Change,
    p2Change,
  };
}
