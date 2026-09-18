-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'SALES', 'STYLIST', 'TAILOR', 'CLEANER', 'DELIVERY', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'AR', 'HI', 'UR');

-- CreateEnum
CREATE TYPE "GarmentCategory" AS ENUM ('BRIDAL_GOWN', 'RECEPTION_DRESS', 'BRIDESMAID', 'EVENING_GOWN', 'ABAYA', 'VEIL', 'JEWELLERY', 'SHOES', 'BELT', 'GLOVES', 'OVERSKIRT', 'ACCESSORIES', 'GROOM_FORMALWEAR');

-- CreateEnum
CREATE TYPE "GarmentStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'BOOKED', 'AWAITING_FITTING', 'IN_FITTING', 'ALTERATION_REQUIRED', 'WITH_TAILOR', 'READY_FOR_FITTING', 'FINAL_FITTING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'WITH_CUSTOMER', 'RETURNED', 'DAMAGE_INSPECTION', 'CLEANING_REQUIRED', 'CLEANING', 'QUALITY_CHECK', 'REPAIR_REQUIRED', 'UNDER_REPAIR', 'READY_TO_RENT', 'OUT_OF_SERVICE', 'SOLD', 'LOST', 'DAMAGED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AvailabilityRisk" AS ENUM ('SAFE', 'TIGHT', 'UNSAFE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('STORE_PICKUP', 'STORE_RETURN', 'HOME_DELIVERY', 'HOME_PICKUP', 'COURIER', 'EXPRESS');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('NEW_CONSULTATION', 'DRESS_SELECTION', 'FITTING', 'ALTERATION_FITTING', 'FINAL_FITTING', 'PICKUP', 'RETURN', 'HOME_FITTING', 'STYLING', 'CUSTOMER_SERVICE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "TailoringStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'READY_FOR_FITTING', 'FITTING_FEEDBACK', 'REVISION_REQUIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CleaningType" AS ENUM ('DRY_CLEAN', 'STEAM', 'HAND_WASH', 'SPOT_CLEAN', 'STAIN_REMOVAL', 'DELICATE_CARE', 'ODOR_TREATMENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "CleaningStatus" AS ENUM ('RECEIVED', 'INSPECTION', 'CLEANING', 'DRYING', 'FINISHING', 'QUALITY_CHECK', 'READY', 'FAILED_QC', 'RE_CLEAN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('REQUIRED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ConditionReportType" AS ENUM ('PRE_RENTAL', 'POST_RENTAL', 'PERIODIC');

-- CreateEnum
CREATE TYPE "DamageChargeStatus" AS ENUM ('PENDING', 'APPROVED', 'WAIVED', 'CHARGED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RESCHEDULED', 'RETURNED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('RENTAL_FEE', 'DEPOSIT', 'ADVANCE', 'BALANCE', 'DELIVERY_FEE', 'ALTERATION_FEE', 'CLEANING_FEE', 'LATE_FEE', 'DAMAGE_CHARGE', 'TAX', 'REFUND', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "TransactionMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID', 'CONTRACT', 'RECEIPT', 'CONSENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "StaffTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED');

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'AE',
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "locale" TEXT NOT NULL DEFAULT 'en-AE',
    "taxLabel" TEXT NOT NULL DEFAULT 'VAT',
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "stateOrRegion" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_settings" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "inspectionBufferHours" INTEGER NOT NULL DEFAULT 2,
    "cleaningBufferHours" INTEGER NOT NULL DEFAULT 8,
    "repairBufferHours" INTEGER NOT NULL DEFAULT 6,
    "qualityCheckBufferHours" INTEGER NOT NULL DEFAULT 1,
    "tightThresholdHours" INTEGER NOT NULL DEFAULT 24,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "hireDate" TIMESTAMP(3),
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "nationality" TEXT,
    "preferredLanguage" "Language" NOT NULL DEFAULT 'EN',
    "weddingDate" TIMESTAMP(3),
    "weddingVenue" TEXT,
    "eventType" TEXT,
    "favoriteDesigners" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stylePreferences" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_measurements" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT NOT NULL DEFAULT 'cm',
    "bust" DECIMAL(6,2),
    "underbust" DECIMAL(6,2),
    "waist" DECIMAL(6,2),
    "hip" DECIMAL(6,2),
    "shoulder" DECIMAL(6,2),
    "armhole" DECIMAL(6,2),
    "sleeve" DECIMAL(6,2),
    "bicep" DECIMAL(6,2),
    "blouseLength" DECIMAL(6,2),
    "frontLength" DECIMAL(6,2),
    "backLength" DECIMAL(6,2),
    "hollowToHem" DECIMAL(6,2),
    "height" DECIMAL(6,2),
    "heelHeight" DECIMAL(6,2),
    "lehengaWaist" DECIMAL(6,2),
    "lehengaLength" DECIMAL(6,2),
    "trainLength" DECIMAL(6,2),
    "customFields" JSONB,
    "takenByUserId" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garments" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GarmentCategory" NOT NULL,
    "designer" TEXT,
    "collection" TEXT,
    "brand" TEXT,
    "size" TEXT,
    "sizeEU" TEXT,
    "sizeUS" TEXT,
    "color" TEXT,
    "fabric" TEXT,
    "style" TEXT,
    "season" TEXT,
    "year" INTEGER,
    "rentalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(12,2),
    "securityDeposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "purchaseCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "replacementValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentStatus" "GarmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "conditionScore" DECIMAL(3,1) NOT NULL DEFAULT 10,
    "currentLocationLabel" TEXT NOT NULL DEFAULT 'Showroom Floor',
    "currentHolderUserId" TEXT,
    "parentGarmentId" TEXT,
    "qrCodeValue" TEXT NOT NULL,
    "notes" TEXT,
    "rentalCount" INTEGER NOT NULL DEFAULT 0,
    "totalRentalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cleaningCostTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "repairCostTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "alterationCostTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_images" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garment_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_status_history" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "fromStatus" "GarmentStatus",
    "toStatus" "GarmentStatus" NOT NULL,
    "changedByUserId" TEXT,
    "changedByRole" "Role",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_locations" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL,
    "movedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garment_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_condition_reports" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "bookingId" TEXT,
    "reportType" "ConditionReportType" NOT NULL,
    "conditionScore" DECIMAL(3,1) NOT NULL,
    "damageCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "inspectedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garment_condition_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_repairs" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "conditionReportId" TEXT,
    "description" TEXT NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'REQUIRED',
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "assignedToUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garment_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_cleaning_jobs" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "bookingId" TEXT,
    "cleaningType" "CleaningType" NOT NULL,
    "status" "CleaningStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "stainNotes" TEXT,
    "instructions" TEXT,
    "assignedToUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "beforePhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "afterPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garment_cleaning_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tailoring_jobs" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "bookingId" TEXT,
    "customerId" TEXT,
    "assignedToUserId" TEXT,
    "status" "TailoringStatus" NOT NULL DEFAULT 'ASSIGNED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "instructions" JSONB,
    "beforeMeasurements" JSONB,
    "afterMeasurements" JSONB,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tailoring_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tailoring_notes" (
    "id" TEXT NOT NULL,
    "tailoringJobId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "note" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tailoring_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "room" TEXT,
    "assignedStaffId" TEXT,
    "notes" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitting_sessions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "feedback" TEXT,
    "stylistNotes" TEXT,
    "customerComments" TEXT,
    "finalSelectionGarmentId" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fitting_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitting_session_garments" (
    "id" TEXT NOT NULL,
    "fittingSessionId" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "feedback" TEXT,

    CONSTRAINT "fitting_session_garments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "rentalStart" TIMESTAMP(3) NOT NULL,
    "rentalEnd" TIMESTAMP(3) NOT NULL,
    "weddingDate" TIMESTAMP(3),
    "pickupDate" TIMESTAMP(3),
    "returnDate" TIMESTAMP(3),
    "trialDate" TIMESTAMP(3),
    "fittingDate" TIMESTAMP(3),
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'STORE_PICKUP',
    "pickupLocation" TEXT,
    "returnMethod" "DeliveryMethod" NOT NULL DEFAULT 'STORE_RETURN',
    "rentalFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "assignedStaffId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_items" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "priceAtBooking" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "depositAtBooking" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_events" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "TransactionMethod" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "receivedByUserId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'HELD',
    "heldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "processedByUserId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_charges" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "conditionReportId" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "DamageChargeStatus" NOT NULL DEFAULT 'PENDING',
    "approvedByUserId" TEXT,
    "approvedAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "damage_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_jobs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "type" "DeliveryMethod" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedDriverId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "actualPickupAt" TIMESTAMP(3),
    "actualDeliveredAt" TIMESTAMP(3),
    "proofPhotoUrl" TEXT,
    "signatureUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "templateId" TEXT,
    "channel" "MessageChannel" NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "sentByUserId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_tasks" (
    "id" TEXT NOT NULL,
    "assignedToUserId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "dueAt" TIMESTAMP(3),
    "status" "StaffTaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "garmentCategory" "GarmentCategory",
    "garmentId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "garmentId" TEXT,
    "bookingId" TEXT,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transfers" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "branch_settings_branchId_key" ON "branch_settings"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_branchId_idx" ON "users"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_userId_key" ON "staff_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profiles_employeeCode_key" ON "staff_profiles"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_key" ON "customers"("userId");

-- CreateIndex
CREATE INDEX "customers_branchId_idx" ON "customers"("branchId");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_lastName_firstName_idx" ON "customers"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "customer_measurements_customerId_isLatest_idx" ON "customer_measurements"("customerId", "isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "garments_sku_key" ON "garments"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "garments_qrCodeValue_key" ON "garments"("qrCodeValue");

-- CreateIndex
CREATE INDEX "garments_branchId_idx" ON "garments"("branchId");

-- CreateIndex
CREATE INDEX "garments_category_idx" ON "garments"("category");

-- CreateIndex
CREATE INDEX "garments_currentStatus_idx" ON "garments"("currentStatus");

-- CreateIndex
CREATE INDEX "garment_images_garmentId_idx" ON "garment_images"("garmentId");

-- CreateIndex
CREATE INDEX "garment_status_history_garmentId_createdAt_idx" ON "garment_status_history"("garmentId", "createdAt");

-- CreateIndex
CREATE INDEX "garment_locations_garmentId_createdAt_idx" ON "garment_locations"("garmentId", "createdAt");

-- CreateIndex
CREATE INDEX "garment_condition_reports_garmentId_idx" ON "garment_condition_reports"("garmentId");

-- CreateIndex
CREATE INDEX "garment_condition_reports_bookingId_idx" ON "garment_condition_reports"("bookingId");

-- CreateIndex
CREATE INDEX "garment_repairs_garmentId_idx" ON "garment_repairs"("garmentId");

-- CreateIndex
CREATE INDEX "garment_cleaning_jobs_garmentId_idx" ON "garment_cleaning_jobs"("garmentId");

-- CreateIndex
CREATE INDEX "garment_cleaning_jobs_status_idx" ON "garment_cleaning_jobs"("status");

-- CreateIndex
CREATE INDEX "garment_cleaning_jobs_assignedToUserId_idx" ON "garment_cleaning_jobs"("assignedToUserId");

-- CreateIndex
CREATE INDEX "tailoring_jobs_garmentId_idx" ON "tailoring_jobs"("garmentId");

-- CreateIndex
CREATE INDEX "tailoring_jobs_status_idx" ON "tailoring_jobs"("status");

-- CreateIndex
CREATE INDEX "tailoring_jobs_assignedToUserId_idx" ON "tailoring_jobs"("assignedToUserId");

-- CreateIndex
CREATE INDEX "appointments_branchId_scheduledAt_idx" ON "appointments"("branchId", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_customerId_idx" ON "appointments"("customerId");

-- CreateIndex
CREATE INDEX "appointments_assignedStaffId_idx" ON "appointments"("assignedStaffId");

-- CreateIndex
CREATE UNIQUE INDEX "fitting_sessions_appointmentId_key" ON "fitting_sessions"("appointmentId");

-- CreateIndex
CREATE INDEX "fitting_session_garments_fittingSessionId_idx" ON "fitting_session_garments"("fittingSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "bookings_branchId_idx" ON "bookings"("branchId");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_rentalStart_rentalEnd_idx" ON "bookings"("rentalStart", "rentalEnd");

-- CreateIndex
CREATE INDEX "booking_items_garmentId_idx" ON "booking_items"("garmentId");

-- CreateIndex
CREATE INDEX "booking_items_bookingId_idx" ON "booking_items"("bookingId");

-- CreateIndex
CREATE INDEX "booking_events_bookingId_createdAt_idx" ON "booking_events"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "deposits_bookingId_idx" ON "deposits"("bookingId");

-- CreateIndex
CREATE INDEX "refunds_bookingId_idx" ON "refunds"("bookingId");

-- CreateIndex
CREATE INDEX "damage_charges_bookingId_idx" ON "damage_charges"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_jobs_jobNumber_key" ON "delivery_jobs"("jobNumber");

-- CreateIndex
CREATE INDEX "delivery_jobs_bookingId_idx" ON "delivery_jobs"("bookingId");

-- CreateIndex
CREATE INDEX "delivery_jobs_assignedDriverId_idx" ON "delivery_jobs"("assignedDriverId");

-- CreateIndex
CREATE INDEX "delivery_jobs_status_idx" ON "delivery_jobs"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "messages_customerId_createdAt_idx" ON "messages"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "staff_tasks_assignedToUserId_status_idx" ON "staff_tasks"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "documents_customerId_idx" ON "documents"("customerId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_transfers_garmentId_idx" ON "inventory_transfers"("garmentId");

-- AddForeignKey
ALTER TABLE "branch_settings" ADD CONSTRAINT "branch_settings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_measurements" ADD CONSTRAINT "customer_measurements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_measurements" ADD CONSTRAINT "customer_measurements_takenByUserId_fkey" FOREIGN KEY ("takenByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garments" ADD CONSTRAINT "garments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garments" ADD CONSTRAINT "garments_parentGarmentId_fkey" FOREIGN KEY ("parentGarmentId") REFERENCES "garments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_images" ADD CONSTRAINT "garment_images_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_status_history" ADD CONSTRAINT "garment_status_history_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_status_history" ADD CONSTRAINT "garment_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_locations" ADD CONSTRAINT "garment_locations_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_locations" ADD CONSTRAINT "garment_locations_movedByUserId_fkey" FOREIGN KEY ("movedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_condition_reports" ADD CONSTRAINT "garment_condition_reports_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_condition_reports" ADD CONSTRAINT "garment_condition_reports_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_condition_reports" ADD CONSTRAINT "garment_condition_reports_inspectedByUserId_fkey" FOREIGN KEY ("inspectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_condition_reports" ADD CONSTRAINT "garment_condition_reports_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_repairs" ADD CONSTRAINT "garment_repairs_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_repairs" ADD CONSTRAINT "garment_repairs_conditionReportId_fkey" FOREIGN KEY ("conditionReportId") REFERENCES "garment_condition_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_repairs" ADD CONSTRAINT "garment_repairs_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_cleaning_jobs" ADD CONSTRAINT "garment_cleaning_jobs_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_cleaning_jobs" ADD CONSTRAINT "garment_cleaning_jobs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garment_cleaning_jobs" ADD CONSTRAINT "garment_cleaning_jobs_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_jobs" ADD CONSTRAINT "tailoring_jobs_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_jobs" ADD CONSTRAINT "tailoring_jobs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_jobs" ADD CONSTRAINT "tailoring_jobs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_jobs" ADD CONSTRAINT "tailoring_jobs_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_notes" ADD CONSTRAINT "tailoring_notes_tailoringJobId_fkey" FOREIGN KEY ("tailoringJobId") REFERENCES "tailoring_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_notes" ADD CONSTRAINT "tailoring_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_sessions" ADD CONSTRAINT "fitting_sessions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_sessions" ADD CONSTRAINT "fitting_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_session_garments" ADD CONSTRAINT "fitting_session_garments_fittingSessionId_fkey" FOREIGN KEY ("fittingSessionId") REFERENCES "fitting_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fitting_session_garments" ADD CONSTRAINT "fitting_session_garments_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_charges" ADD CONSTRAINT "damage_charges_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_charges" ADD CONSTRAINT "damage_charges_conditionReportId_fkey" FOREIGN KEY ("conditionReportId") REFERENCES "garment_condition_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_charges" ADD CONSTRAINT "damage_charges_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_jobs" ADD CONSTRAINT "delivery_jobs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_jobs" ADD CONSTRAINT "delivery_jobs_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "garments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
