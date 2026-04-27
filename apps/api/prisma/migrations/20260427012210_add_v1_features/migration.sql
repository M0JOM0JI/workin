-- CreateEnum
CREATE TYPE "AutoClockOutMode" AS ENUM ('SCHEDULE', 'MAX_HOURS', 'MIDNIGHT');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('NONE', 'FOUR_MAJOR', 'THREE_THREE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScheduleRequestType" AS ENUM ('CHANGE', 'CANCEL', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ATTENDANCE_REQUEST_APPROVED', 'ATTENDANCE_REQUEST_REJECTED', 'ATTENDANCE_REQUEST_SUBMITTED', 'SCHEDULE_CONFIRMED', 'SCHEDULE_REQUEST_APPROVED', 'SCHEDULE_REQUEST_REJECTED', 'PAYROLL_CONFIRMED', 'ANNOUNCEMENT');

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "isAutoClockOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memo" TEXT;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repeatRule" TEXT;

-- AlterTable
ALTER TABLE "store_staffs" ADD COLUMN     "contractHoursPerMonth" INTEGER,
ADD COLUMN     "insuranceType" "InsuranceType" NOT NULL DEFAULT 'THREE_THREE',
ADD COLUMN     "memo" TEXT;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "autoClockOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoClockOutBuffer" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "autoClockOutMaxHours" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "autoClockOutMode" "AutoClockOutMode" NOT NULL DEFAULT 'MIDNIGHT',
ADD COLUMN     "nightShiftEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nightShiftMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "overtimeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtimeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "payDay" INTEGER NOT NULL DEFAULT 25;

-- CreateTable
CREATE TABLE "attendance_requests" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "attendanceId" TEXT,
    "requestedClockIn" TIMESTAMP(3) NOT NULL,
    "requestedClockOut" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_requests" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "requestType" "ScheduleRequestType" NOT NULL,
    "requestedStartAt" TIMESTAMP(3),
    "requestedEndAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_preferences" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "referenceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "regularMinutes" INTEGER NOT NULL DEFAULT 0,
    "nightMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "basePay" INTEGER NOT NULL DEFAULT 0,
    "nightAllowance" INTEGER NOT NULL DEFAULT 0,
    "overtimePay" INTEGER NOT NULL DEFAULT 0,
    "weeklyAllowance" INTEGER NOT NULL DEFAULT 0,
    "deduction" INTEGER NOT NULL DEFAULT 0,
    "netPay" INTEGER NOT NULL DEFAULT 0,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_requests_storeId_status_idx" ON "attendance_requests"("storeId", "status");

-- CreateIndex
CREATE INDEX "attendance_requests_staffId_idx" ON "attendance_requests"("staffId");

-- CreateIndex
CREATE INDEX "schedule_requests_storeId_status_idx" ON "schedule_requests"("storeId", "status");

-- CreateIndex
CREATE INDEX "schedule_requests_staffId_idx" ON "schedule_requests"("staffId");

-- CreateIndex
CREATE INDEX "work_preferences_storeId_idx" ON "work_preferences"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "work_preferences_staffId_dayOfWeek_key" ON "work_preferences"("staffId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "announcements_storeId_createdAt_idx" ON "announcements"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "payrolls_storeId_yearMonth_idx" ON "payrolls"("storeId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_staffId_yearMonth_key" ON "payrolls"("staffId", "yearMonth");

-- AddForeignKey
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "store_staffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "store_staffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_requests" ADD CONSTRAINT "schedule_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_preferences" ADD CONSTRAINT "work_preferences_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_preferences" ADD CONSTRAINT "work_preferences_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "store_staffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "store_staffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
