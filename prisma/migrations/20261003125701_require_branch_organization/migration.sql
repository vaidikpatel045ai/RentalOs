/*
  Warnings:

  - Made the column `organizationId` on table `branches` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "branches" DROP CONSTRAINT "branches_organizationId_fkey";

-- AlterTable
ALTER TABLE "branches" ALTER COLUMN "organizationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
