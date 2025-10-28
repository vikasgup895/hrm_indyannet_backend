/*
  Warnings:

  - You are about to alter the column `maxCarryForward` on the `LeavePolicy` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Added the required column `updatedAt` to the `LeaveBalance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LeavePolicy` table without a default value. This is not possible if the table is not empty.
  - Made the column `requiresDocAfter` on table `LeavePolicy` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "allotted" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "opening" SET DEFAULT 0,
ALTER COLUMN "accrued" SET DEFAULT 0,
ALTER COLUMN "used" SET DEFAULT 0,
ALTER COLUMN "adjusted" SET DEFAULT 0,
ALTER COLUMN "closing" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "LeavePolicy" ADD COLUMN     "annualQuota" INTEGER DEFAULT 12,
ADD COLUMN     "carryForward" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "region" DROP NOT NULL,
ALTER COLUMN "region" SET DEFAULT 'IN',
ALTER COLUMN "accrualPerMonth" SET DEFAULT 1.75,
ALTER COLUMN "maxCarryForward" SET DEFAULT 12,
ALTER COLUMN "maxCarryForward" SET DATA TYPE INTEGER,
ALTER COLUMN "requiresDocAfter" SET NOT NULL,
ALTER COLUMN "requiresDocAfter" SET DEFAULT 3;
