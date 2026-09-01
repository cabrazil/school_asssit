-- AlterTable
ALTER TABLE "school_events" ADD COLUMN     "action_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "start_date" TIMESTAMP(3),
ADD COLUMN     "target_grade" TEXT,
ADD COLUMN     "target_scope" TEXT,
ADD COLUMN     "url" TEXT;
