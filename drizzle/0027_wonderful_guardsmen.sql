ALTER TABLE "registry" ADD COLUMN "list_on_marketplace" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "registry" ADD COLUMN "individual_price" integer;--> statement-breakpoint
ALTER TABLE "registry" ADD COLUMN "team_price" integer;