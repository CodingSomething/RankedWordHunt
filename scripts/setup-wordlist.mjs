import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_URL = process.env.WORD_LIST_SOURCE_URL ?? "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt";
const outputDir = resolve(process.cwd(), "apps/server/data");
const outputPath = resolve(outputDir, "words.txt");
const metaPath = resolve(outputDir, "wordlist-meta.json");
const noticePath = resolve(outputDir, "ENABLE_NOTICE.md");
const allowPath = resolve(outputDir, "words-allow.txt");
const blockPath = resolve(outputDir, "words-block.txt");

function normalizeLine(line) {
  return line.trim().replace(/^"|"$/g, "").toLowerCase();
}

function parseOverrides(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim().toLowerCase())
    .filter((word) => /^[a-z]+$/.test(word));
}

async function readOptional(path) {
  try { return await readFile(path, "utf8"); }
  catch { return ""; }
}

async function download(url, label) {
  const response = await fetch(url, { headers: { "User-Agent": "wordhunt-wordlist-setup" } });
  if (!response.ok) throw new Error(`${label} download failed (${response.status} ${response.statusText})`);
  return response.text();
}

async function main() {
  console.log("Downloading the public-domain ENABLE game word list...");
  const sourceText = await download(SOURCE_URL, "Word list");

  const words = new Set(
    sourceText
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter((word) => /^[a-z]+$/.test(word))
      .filter((word) => word.length >= 3 && word.length <= 16),
  );

  const allowed = parseOverrides(await readOptional(allowPath));
  const blocked = parseOverrides(await readOptional(blockPath));
  for (const word of allowed) if (word.length >= 3 && word.length <= 16) words.add(word);
  for (const word of blocked) words.delete(word);

  const sorted = [...words].sort();
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${sorted.join("\n")}\n`, "utf8");
  await writeFile(noticePath, `# ENABLE word list\n\nThis project uses ENABLE (Enhanced North American Benchmark Lexicon) as its default open word-game dictionary. ENABLE was released into the public domain by its maintainers and is widely used as an alternative to proprietary tournament lexicons.\n\nMirror used by the setup script: ${SOURCE_URL}\n\nThe generated game dictionary keeps alphabetic words from 3 through 16 letters and then applies this project\'s allow/block overrides.\n`, "utf8");
  await writeFile(metaPath, JSON.stringify({
    source: "ENABLE public-domain word-game lexicon",
    sourceUrl: SOURCE_URL,
    license: "Public domain",
    generatedAt: new Date().toISOString(),
    minimumLength: 3,
    maximumLength: 16,
    wordCount: sorted.length,
    allowOverrides: allowed.length,
    blockOverrides: blocked.length,
  }, null, 2) + "\n", "utf8");

  console.log(`Saved ${sorted.length.toLocaleString()} playable words to apps/server/data/words.txt`);
  console.log("Restart the server after changing the word list.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
