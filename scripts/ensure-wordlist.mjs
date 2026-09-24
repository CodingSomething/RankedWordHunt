import { stat, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const wordListPath = resolve(process.cwd(), "apps/server/data/words.txt");

async function hasFullWordList() {
  try {
    const info = await stat(wordListPath);
    if (info.size < 100_000) return false;
    const text = await readFile(wordListPath, "utf8");
    return text.split(/\r?\n/).filter(Boolean).length > 10_000;
  } catch {
    return false;
  }
}

if (await hasFullWordList()) {
  console.log("Full game dictionary already present; skipping download.");
  process.exit(0);
}

console.log("Full game dictionary is missing; generating it now...");
const child = spawn(process.execPath, [resolve(process.cwd(), "scripts/setup-wordlist.mjs")], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 1));
