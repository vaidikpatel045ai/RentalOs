-- Optional photography module. Additive only: new enums, tables, a Role value
-- and an Organization flag that defaults to off, so no boutique sees it until enabled.
-- CreateEnum
CREATE TYPE "PhotoShootType" AS ENUM ('PRE_WEDDING', 'BRIDAL', 'ENGAGEMENT', 'WEDDING_DAY', 'MATERNITY', 'FAMILY', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PhotoShootStatus" AS ENUM ('REQUESTED', 'BOOKED', 'SHOT', 'EDITING', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PHOTOGRAPHER';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "photographyEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "photo_services" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PhotoShootType" NOT NULL,
    "description" TEXT,
    "deliverables" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_shoots" (
    "id" TEXT NOT NULL,
    "shootNumber" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "bookingId" TEXT,
    "photographerId" TEXT,
    "type" "PhotoShootType" NOT NULL,
    "status" "PhotoShootStatus" NOT NULL DEFAULT 'BOOKED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "location" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "photographerNotes" TEXT,
    "galleryUrl" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_shoots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_shoot_payments" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "TransactionMethod" NOT NULL,
    "reference" TEXT,
    "receivedByUserId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_shoot_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_services_branchId_idx" ON "photo_services"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "photo_shoots_shootNumber_key" ON "photo_shoots"("shootNumber");

-- CreateIndex
CREATE INDEX "photo_shoots_branchId_scheduledAt_idx" ON "photo_shoots"("branchId", "scheduledAt");

-- CreateIndex
CREATE INDEX "photo_shoots_photographerId_idx" ON "photo_shoots"("photographerId");

-- CreateIndex
CREATE INDEX "photo_shoots_customerId_idx" ON "photo_shoots"("customerId");

-- CreateIndex
CREATE INDEX "photo_shoot_payments_shootId_idx" ON "photo_shoot_payments"("shootId");

-- AddForeignKey
ALTER TABLE "photo_services" ADD CONSTRAINT "photo_services_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_shoots" ADD CONSTRAINT "photo_shoots_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_shoots" ADD CONSTRAINT "photo_shoots_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_shoots" ADD CONSTRAINT "photo_shoots_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "photo_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_shoots" ADD CONSTRAINT "photo_shoots_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_shoots" ADD CONSTRAINT "photo_shoots_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_shoot_payments" ADD CONSTRAINT "photo_shoot_payments_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "photo_shoots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_shoot_payments" ADD CONSTRAINT "photo_shoot_payments_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

