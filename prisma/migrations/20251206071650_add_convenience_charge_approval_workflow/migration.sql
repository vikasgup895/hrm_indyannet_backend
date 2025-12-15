-- CreateEnum
CREATE TYPE "ConvenienceChargeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ConvenienceCharge" ADD COLUMN     "approvalDate" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "payslipId" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "ConvenienceChargeStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "ConvenienceCharge" ADD CONSTRAINT "ConvenienceCharge_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "Payslip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
