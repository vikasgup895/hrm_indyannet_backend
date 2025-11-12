/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,payrollRunId]` on the table `Payslip` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Payslip_employeeId_payrollRunId_key" ON "Payslip"("employeeId", "payrollRunId");
