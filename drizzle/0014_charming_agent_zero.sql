ALTER TABLE "apikey" ADD COLUMN "device_temp_api_key" text;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "has_been_delinquent";