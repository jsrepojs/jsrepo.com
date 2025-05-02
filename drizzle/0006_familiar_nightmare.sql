ALTER TABLE "anon_session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anon_session_code" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "anon_session_code" CASCADE;--> statement-breakpoint
DROP INDEX "apikey_device_hardware_id_idx";--> statement-breakpoint
ALTER TABLE "anon_session" ALTER COLUMN "expires" SET DEFAULT '2025-05-01 18:29:27.079';--> statement-breakpoint
ALTER TABLE "anon_session" ADD COLUMN "code" varchar(6) NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "device_activated" boolean;--> statement-breakpoint
ALTER TABLE "anon_session" DROP COLUMN "hardware_id";--> statement-breakpoint
ALTER TABLE "apikey" DROP COLUMN "device_hardware_id";--> statement-breakpoint
ALTER TABLE "apikey" DROP COLUMN "device_active";