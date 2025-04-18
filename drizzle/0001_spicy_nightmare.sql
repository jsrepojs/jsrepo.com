ALTER TABLE "file" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
CREATE INDEX "file_name_idx" ON "file" USING btree ("name");