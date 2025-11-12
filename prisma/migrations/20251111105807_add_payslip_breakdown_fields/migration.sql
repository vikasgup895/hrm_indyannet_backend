/*
  Warnings:

  - You are about to drop the column `lines` on the `Payslip` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Payslip_employeeId_payrollRunId_key";

-- AlterTable
ALTER TABLE "Payslip" DROP COLUMN "lines",
ADD COLUMN     "basic" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "bonus" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "conveyance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "epf" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "hra" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "medical" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "otherDeductions" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "otherEarnings" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "professionalTax" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "currency" SET DEFAULT 'INR',
ALTER COLUMN "updatedAt" DROP DEFAULT;
