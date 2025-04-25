ALTER TABLE "daily_registry_fetch" DROP CONSTRAINT "daily_registry_fetch_registry_id_registry_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" DROP CONSTRAINT "daily_registry_fetch_version_id_version_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD COLUMN "scope_name" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD COLUMN "registry_name" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD COLUMN "version" text NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_scope_name_scope_name_fk" FOREIGN KEY ("scope_name") REFERENCES "public"."scope"("name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_scope_name_idx" ON "daily_registry_fetch" USING btree ("scope_name");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_registry_name_idx" ON "daily_registry_fetch" USING btree ("registry_name");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_version_idx" ON "daily_registry_fetch" USING btree ("version");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_file_name_idx" ON "daily_registry_fetch" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_count_idx" ON "daily_registry_fetch" USING btree ("count");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_day_idx" ON "daily_registry_fetch" USING btree ("day");--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" DROP COLUMN "registry_id";--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" DROP COLUMN "version_id";--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_scope_name_registry_name_version_file_name_day_unique" UNIQUE("scope_name","registry_name","version","file_name","day");