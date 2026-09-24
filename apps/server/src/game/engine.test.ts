import test from "node:test";
import assert from "node:assert/strict";
import { calculateElo, isValidPath, pathToWord } from "./engine";

test("equal-rated draw leaves both ratings unchanged", () => {
  assert.deepEqual(calculateElo(1200, 1200, 0.5), {
    newP1Elo: 1200,
    newP2Elo: 1200,
    p1Change: 0,
    p2Change: 0,
  });
});

test("winner gains and loser loses ELO", () => {
  const result = calculateElo(1200, 1200, 1);
  assert.equal(result.p1Change, 16);
  assert.equal(result.p2Change, -16);
});

test("path validation rejects reused cells", () => {
  assert.equal(isValidPath([0, 1, 0]), false);
  assert.equal(isValidPath([0, 1, 5]), true);
});

test("pathToWord uses board indices", () => {
  assert.equal(pathToWord("ABCDEFGHIJKLMNOP", [0, 1, 5]), "ABF");
});
