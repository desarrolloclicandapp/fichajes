-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "workDays" TEXT,
ADD COLUMN     "workEndMinutes" INTEGER,
ADD COLUMN     "workStartMinutes" INTEGER;

-- CreateTable
CREATE TABLE "public"."CompanyHoliday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyHoliday_companyId_date_key" ON "public"."CompanyHoliday"("companyId", "date");

-- AddForeignKey
ALTER TABLE "public"."CompanyHoliday" ADD CONSTRAINT "CompanyHoliday_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
