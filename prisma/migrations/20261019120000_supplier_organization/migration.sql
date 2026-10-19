-- Suppliers belong to one boutique. Added as nullable, backfilled, then
-- made required, so the migration is safe even if suppliers already exist.
-- When it was written there was a single organization, so any existing
-- supplier can only belong to it.
ALTER TABLE "suppliers" ADD COLUMN "organizationId" TEXT;

UPDATE "suppliers"
SET "organizationId" = (SELECT "id" FROM "organizations" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizationId" IS NULL;

ALTER TABLE "suppliers" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "suppliers_organizationId_idx" ON "suppliers"("organizationId");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
