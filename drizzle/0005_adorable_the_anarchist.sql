CREATE TABLE "anon_session" (
	"id" text PRIMARY KEY NOT NULL,
	"hardware_id" text NOT NULL,
	"expires" timestamp DEFAULT '2025-05-01 17:41:19.753'
);
--> statement-breakpoint
CREATE TABLE "anon_session_code" (
	"id" text NOT NULL,
	"anon_session_id" text NOT NULL,
	"expires" timestamp DEFAULT '2025-05-01 17:41:19.753',
	"code_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "device_hardware_id" text;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "device_session_id" text;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "device_active" boolean;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_anon_session_id_anon_session_id_fk" FOREIGN KEY ("anon_session_id") REFERENCES "public"."anon_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anon_session_code_session_id_idx" ON "anon_session_code" USING btree ("anon_session_id");--> statement-breakpoint
CREATE INDEX "anon_session_code_user_id_idx" ON "anon_session_code" USING btree ("id");--> statement-breakpoint
CREATE INDEX "apikey_device_session_id_idx" ON "apikey" USING btree ("device_session_id");--> statement-breakpoint
CREATE INDEX "apikey_device_hardware_id_idx" ON "apikey" USING btree ("device_hardware_id");