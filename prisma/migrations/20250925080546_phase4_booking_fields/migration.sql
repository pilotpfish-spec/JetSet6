/*
  Warnings:

  - Added the required column `priceCents` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledAt` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "priceCents" INTEGER NOT NULL,
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL;
