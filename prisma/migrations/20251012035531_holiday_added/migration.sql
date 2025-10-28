/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Holiday` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Holiday_name_key" ON "Holiday"("name");
