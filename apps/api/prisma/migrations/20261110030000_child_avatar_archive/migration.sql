ALTER TABLE "Child" ADD COLUMN "avatar" TEXT NOT NULL DEFAULT '🧒';
ALTER TABLE "Child" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "Child_familyId_archivedAt_idx" ON "Child"("familyId", "archivedAt");
