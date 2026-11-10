CREATE TABLE "ChildAllocationPolicy" (
  "id" UUID NOT NULL,
  "childId" UUID NOT NULL,
  "expensesBps" INTEGER NOT NULL,
  "savingsBps" INTEGER NOT NULL,
  "donationBps" INTEGER NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChildAllocationPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChildAllocationPolicy_childId_key" ON "ChildAllocationPolicy"("childId");

ALTER TABLE "ChildAllocationPolicy"
ADD CONSTRAINT "ChildAllocationPolicy_childId_fkey"
FOREIGN KEY ("childId") REFERENCES "Child"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the family's existing split for every existing child.
INSERT INTO "ChildAllocationPolicy"
  ("id", "childId", "expensesBps", "savingsBps", "donationBps", "effectiveAt")
SELECT
  gen_random_uuid(),
  c."id",
  COALESCE(a."expensesBps", 5000),
  COALESCE(a."savingsBps", 3000),
  COALESCE(a."donationBps", 2000),
  COALESCE(a."effectiveAt", CURRENT_TIMESTAMP)
FROM "Child" c
LEFT JOIN "AllocationPolicy" a ON a."familyId" = c."familyId";
