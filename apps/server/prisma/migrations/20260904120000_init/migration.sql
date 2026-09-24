-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "elo" INTEGER NOT NULL DEFAULT 1200,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'WAITING',
    "board" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "player1Score" INTEGER NOT NULL DEFAULT 0,
    "player2Score" INTEGER NOT NULL DEFAULT 0,
    "player1EloBefore" INTEGER NOT NULL,
    "player2EloBefore" INTEGER,
    "player1EloAfter" INTEGER,
    "player2EloAfter" INTEGER,
    "winnerId" TEXT,
    "abandonedById" TEXT,
    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordFound" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WordFound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EloHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "elo" INTEGER NOT NULL,
    "change" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EloHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Match_player1Id_finishedAt_idx" ON "Match"("player1Id", "finishedAt");
CREATE INDEX "Match_player2Id_finishedAt_idx" ON "Match"("player2Id", "finishedAt");
CREATE INDEX "Match_status_idx" ON "Match"("status");
CREATE UNIQUE INDEX "WordFound_matchId_userId_word_key" ON "WordFound"("matchId", "userId", "word");
CREATE INDEX "WordFound_userId_foundAt_idx" ON "WordFound"("userId", "foundAt");
CREATE INDEX "EloHistory_userId_createdAt_idx" ON "EloHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WordFound" ADD CONSTRAINT "WordFound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordFound" ADD CONSTRAINT "WordFound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EloHistory" ADD CONSTRAINT "EloHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EloHistory" ADD CONSTRAINT "EloHistory_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
