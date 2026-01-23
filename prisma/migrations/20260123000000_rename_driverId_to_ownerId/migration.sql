-- Rename driverId column to ownerId in Ride table
ALTER TABLE "Ride" RENAME COLUMN "driverId" TO "ownerId";

-- Drop the old index and create a new one with the correct name
DROP INDEX IF EXISTS "Ride_driverId_idx";
CREATE INDEX "Ride_ownerId_idx" ON "Ride"("ownerId");
