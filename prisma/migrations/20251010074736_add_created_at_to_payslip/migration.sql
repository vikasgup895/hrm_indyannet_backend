/*
  Warnings:

  - You are about to alter the column `baseSalary` on the `Compensation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `DoublePrecision`.
  - You are about to alter the column `opening` on the `LeaveBalance` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `accrued` on the `LeaveBalance` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `used` on the `LeaveBalance` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `adjusted` on the `LeaveBalance` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `closing` on the `LeaveBalance` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `accrualPerMonth` on the `LeavePolicy` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `maxCarryForward` on the `LeavePolicy` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to alter the column `days` on the `LeaveRequest` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.
  - You are about to drop the column `publishedAt` on the `Payslip` table. All the data in the column will be lost.
  - You are about to alter the column `gross` on the `Payslip` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `DoublePrecision`.
  - You are about to alter the column `deductions` on the `Payslip` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `DoublePrecision`.
  - You are about to alter the column `net` on the `Payslip` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "Compensation" ALTER COLUMN "baseSalary" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LeaveBalance" ALTER COLUMN "opening" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "accrued" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "used" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "adjusted" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "closing" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LeavePolicy" ALTER COLUMN "accrualPerMonth" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "maxCarryForward" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LeaveRequest" ALTER COLUMN "days" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Payslip" DROP COLUMN "publishedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "gross" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "deductions" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "net" SET DATA TYPE DOUBLE PRECISION;
