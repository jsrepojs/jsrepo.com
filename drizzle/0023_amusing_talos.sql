CREATE TABLE "marketplace_purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_purchase_intent_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"reference_id" text NOT NULL,
	"registry_id" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_purchase_stripe_purchase_intent_id_unique" UNIQUE("stripe_purchase_intent_id")
);
--> statement-breakpoint
ALTER TABLE "marketplace_purchase" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketplace_purchase" ADD CONSTRAINT "marketplace_purchase_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;