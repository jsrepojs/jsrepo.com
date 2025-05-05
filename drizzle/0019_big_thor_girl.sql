DROP INDEX "registry_private_idx";--> statement-breakpoint
ALTER TABLE "registry" ALTER COLUMN "access" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "registry_access_idx" ON "registry" USING btree ("access");--> statement-breakpoint
ALTER TABLE "registry" DROP COLUMN "private";