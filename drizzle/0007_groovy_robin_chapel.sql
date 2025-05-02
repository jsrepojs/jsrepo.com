CREATE TABLE "anon_session_code" (
	"id" text NOT NULL,
	"anon_session_id" text NOT NULL,
	"expires" timestamp DEFAULT '2025-05-01 19:55:22.481' NOT NULL,
	"code_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anon_session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anon_session" ALTER COLUMN "expires" SET DEFAULT '2025-05-01 20:05:22.481';--> statement-breakpoint
ALTER TABLE "anon_session" ALTER COLUMN "expires" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "anon_session" ADD COLUMN "hardware_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "device_hardware_id" text;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_anon_session_id_anon_session_id_fk" FOREIGN KEY ("anon_session_id") REFERENCES "public"."anon_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anon_session_code_session_id_idx" ON "anon_session_code" USING btree ("anon_session_id");--> statement-breakpoint
CREATE INDEX "anon_session_code_user_id_idx" ON "anon_session_code" USING btree ("id");--> statement-breakpoint
CREATE INDEX "apikey_device_hardware_id_idx" ON "apikey" USING btree ("device_hardware_id");--> statement-breakpoint
ALTER TABLE "anon_session" DROP COLUMN "code";