CREATE TABLE "GameSession" (
  "id" UUID NOT NULL,
  "childId" UUID NOT NULL,
  "gameId" VARCHAR(40) NOT NULL,
  "title" VARCHAR(80) NOT NULL,
  "score" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GameSession_childId_completedAt_idx" ON "GameSession"("childId", "completedAt");
CREATE INDEX "GameSession_childId_gameId_completedAt_idx" ON "GameSession"("childId", "gameId", "completedAt");
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
