export interface QueueEntry {
  socketId: string;
  userId: string;
  username: string;
  elo: number;
  joinedAt: number;
}

const queue: QueueEntry[] = [];

export function enqueue(entry: QueueEntry): number {
  dequeue(entry.userId);
  queue.push(entry);
  queue.sort((a, b) => a.joinedAt - b.joinedAt);
  return positionOf(entry.userId);
}

export function dequeue(userId: string): void {
  const index = queue.findIndex((entry) => entry.userId === userId);
  if (index !== -1) queue.splice(index, 1);
}

export function dequeueBySocket(socketId: string): QueueEntry | null {
  const index = queue.findIndex((entry) => entry.socketId === socketId);
  if (index === -1) return null;
  const [entry] = queue.splice(index, 1);
  return entry;
}

function allowedEloGap(waitMs: number): number {
  const tenSecondBlocks = Math.floor(waitMs / 10_000);
  return Math.min(600, 100 + tenSecondBlocks * 50);
}

export function tryDequeueMatch(now = Date.now()): [QueueEntry, QueueEntry] | null {
  if (queue.length < 2) return null;

  for (let i = 0; i < queue.length - 1; i++) {
    const player = queue[i];
    const waitMs = now - player.joinedAt;
    const gap = allowedEloGap(waitMs);

    let bestIndex = -1;
    let bestDifference = Number.POSITIVE_INFINITY;

    for (let j = i + 1; j < queue.length; j++) {
      const candidate = queue[j];
      const difference = Math.abs(player.elo - candidate.elo);
      const candidateGap = allowedEloGap(now - candidate.joinedAt);
      const mutualGap = Math.max(gap, candidateGap);
      if (difference <= mutualGap && difference < bestDifference) {
        bestDifference = difference;
        bestIndex = j;
      }
    }

    if (bestIndex !== -1) {
      const [p2] = queue.splice(bestIndex, 1);
      const [p1] = queue.splice(i, 1);
      return [p1, p2];
    }
  }

  return null;
}

export function queueLength(): number {
  return queue.length;
}

export function positionOf(userId: string): number {
  const index = queue.findIndex((entry) => entry.userId === userId);
  return index === -1 ? 0 : index + 1;
}

export function clearQueueForTests(): void {
  queue.splice(0, queue.length);
}
