/*
  Warnings:

  - You are about to drop the column `citations` on the `ActionItem` table. All the data in the column will be lost.
  - Added the required column `speakerTimestamp` to the `ActionItem` table without a default value. This is not possible if the table is not empty.
  - Made the column `assignee` on table `ActionItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ActionItem" DROP COLUMN "citations",
ADD COLUMN     "speakerTimestamp" TEXT NOT NULL,
ALTER COLUMN "assignee" SET NOT NULL;
