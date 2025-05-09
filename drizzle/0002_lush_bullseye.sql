CREATE TYPE "public"."registry_price_target" AS ENUM('individual', 'org');--> statement-breakpoint
CREATE TABLE "registry_price" (
	"id" serial PRIMARY KEY NOT NULL,
	"registry_id" integer NOT NULL,
	"target" "registry_price_target" NOT NULL,
	"cost" integer NOT NULL,
	"discount" integer,
	"discount_until" timestamp
);
--> statement-breakpoint
ALTER TABLE "registry_price" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "registry_price" ADD CONSTRAINT "registry_price_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registry_price_registry_id_idx" ON "registry_price" USING btree ("registry_id");