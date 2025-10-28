/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `LeavePolicy` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_name_key" ON "LeavePolicy"("name");
