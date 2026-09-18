-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DEMO_SCHEDULED', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateTable
CREATE TABLE "sales_inquiries" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "branchCount" TEXT,
    "message" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_inquiries_status_createdAt_idx" ON "sales_inquiries"("status", "createdAt");
