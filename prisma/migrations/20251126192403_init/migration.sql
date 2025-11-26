-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'CLIENT_ADMIN', 'WORKER');

-- CreateEnum
CREATE TYPE "public"."TimeEventType" AS ENUM ('CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT');

-- CreateEnum
CREATE TYPE "public"."AbsenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AbsenceType" AS ENUM ('VACATION', 'SICK_LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'JUSTIFIED_OTHER', 'UNJUSTIFIED');

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'WORKER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeEvent" (
    "id" TEXT NOT NULL,
    "type" "public"."TimeEventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TimeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeDailySummary" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TimeDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AbsenceRequest" (
    "id" TEXT NOT NULL,
    "requestedType" "public"."AbsenceType" NOT NULL,
    "finalType" "public"."AbsenceType",
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."AbsenceStatus" NOT NULL,
    "reason" TEXT,
    "adminComment" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AbsenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,
    "userId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TimeDailySummary_userId_date_key" ON "public"."TimeDailySummary"("userId", "date");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEvent" ADD CONSTRAINT "TimeEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEvent" ADD CONSTRAINT "TimeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeDailySummary" ADD CONSTRAINT "TimeDailySummary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeDailySummary" ADD CONSTRAINT "TimeDailySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
