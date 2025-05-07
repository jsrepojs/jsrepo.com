CREATE TABLE "common_name_ban" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "common_name_ban" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "common_name_ban_name_idx" ON "common_name_ban" USING btree ("name");