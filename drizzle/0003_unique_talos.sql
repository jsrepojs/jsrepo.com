ALTER TABLE "registry" ADD COLUMN "stripe_connect_account" text;--> statement-breakpoint
ALTER TABLE "registry" DROP COLUMN "individual_price";--> statement-breakpoint
ALTER TABLE "registry" DROP COLUMN "org_price";