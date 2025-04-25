CREATE TABLE "daily_registry_fetch" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_id" integer NOT NULL,
	"registry_id" integer NOT NULL,
	"version_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"count" integer NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "daily_registry_fetch_scope_id_registry_id_version_id_file_name_day_unique" UNIQUE("scope_id","registry_id","version_id","file_name","day")
);
--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_scope_id_idx" ON "daily_registry_fetch" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_registry_id_idx" ON "daily_registry_fetch" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_version_id_idx" ON "daily_registry_fetch" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_file_name_idx" ON "daily_registry_fetch" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_count_idx" ON "daily_registry_fetch" USING btree ("count");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_day_idx" ON "daily_registry_fetch" USING btree ("day");