/*
  Warnings:

  - You are about to drop the column `isPrimary` on the `BankDetail` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId]` on the table `BankDetail` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."BankDetail_employeeId_accountNumber_key";

-- AlterTable
ALTER TABLE "BankDetail" DROP COLUMN "isPrimary",
ADD COLUMN     "pfNumber" TEXT,
ADD COLUMN     "uan" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BankDetail_employeeId_key" ON "BankDetail"("employeeId");
