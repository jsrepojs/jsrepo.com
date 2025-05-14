ALTER TABLE "file" ALTER COLUMN "storage_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "file" DROP COLUMN "content";