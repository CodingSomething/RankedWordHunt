import test from "node:test";
import assert from "node:assert/strict";
import { clearQueueForTests, enqueue, tryDequeueMatch } from "./matchmaking";

test("matches nearby ratings immediately", () => {
  clearQueueForTests();
  const now = 1_000_000;
  enqueue({ socketId: "a", userId: "a", username: "a", elo: 1200, joinedAt: now });
  enqueue({ socketId: "b", userId: "b", username: "b", elo: 1260, joinedAt: now });
  const pair = tryDequeueMatch(now);
  assert.ok(pair);
  assert.deepEqual(pair.map((entry) => entry.userId), ["a", "b"]);
});

test("does not immediately match a large ELO gap", () => {
  clearQueueForTests();
  const now = 1_000_000;
  enqueue({ socketId: "a", userId: "a", username: "a", elo: 1000, joinedAt: now });
  enqueue({ socketId: "b", userId: "b", username: "b", elo: 1400, joinedAt: now });
  assert.equal(tryDequeueMatch(now), null);
});

test("widens the ELO window while waiting", () => {
  clearQueueForTests();
  const joinedAt = 1_000_000;
  enqueue({ socketId: "a", userId: "a", username: "a", elo: 1000, joinedAt });
  enqueue({ socketId: "b", userId: "b", username: "b", elo: 1300, joinedAt });
  assert.ok(tryDequeueMatch(joinedAt + 40_000));
});
