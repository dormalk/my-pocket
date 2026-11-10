CREATE TYPE "TaskFrequency" AS ENUM ('DAILY', 'WEEKLY');

CREATE TABLE "PurseTask" (
  "id" UUID NOT NULL,
  "childId" UUID NOT NULL,
  "purseId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "frequency" "TaskFrequency" NOT NULL,
  "amountAgorot" INTEGER NOT NULL,
  "weeklyRequiredCount" INTEGER NOT NULL DEFAULT 3,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurseTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskApproval" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "completedOn" DATE NOT NULL,
  "approvedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskReward" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "weekStart" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskApproval_taskId_completedOn_key" ON "TaskApproval"("taskId", "completedOn");
CREATE INDEX "TaskApproval_taskId_completedOn_idx" ON "TaskApproval"("taskId", "completedOn");
CREATE UNIQUE INDEX "TaskReward_taskId_weekStart_key" ON "TaskReward"("taskId", "weekStart");
CREATE INDEX "PurseTask_childId_active_idx" ON "PurseTask"("childId", "active");
CREATE INDEX "PurseTask_purseId_active_idx" ON "PurseTask"("purseId", "active");

ALTER TABLE "PurseTask" ADD CONSTRAINT "PurseTask_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurseTask" ADD CONSTRAINT "PurseTask_purseId_fkey" FOREIGN KEY ("purseId") REFERENCES "Purse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskApproval" ADD CONSTRAINT "TaskApproval_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PurseTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskReward" ADD CONSTRAINT "TaskReward_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PurseTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
