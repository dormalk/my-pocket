CREATE TABLE "ChildAccessLink" (
  "id" UUID NOT NULL,
  "childId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "ChildAccessLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChildAccessLink_childId_key" ON "ChildAccessLink"("childId");
CREATE UNIQUE INDEX "ChildAccessLink_tokenHash_key" ON "ChildAccessLink"("tokenHash");
CREATE INDEX "ChildAccessLink_tokenHash_revokedAt_idx" ON "ChildAccessLink"("tokenHash", "revokedAt");
ALTER TABLE "ChildAccessLink" ADD CONSTRAINT "ChildAccessLink_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
