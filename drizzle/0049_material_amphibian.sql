CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"cancel_at_period_end" boolean,
	"seats" integer,
	"trialStart" timestamp,
	"trialEnd" timestamp
);
--> statement-breakpoint
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_customer_id_idx" ON "subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_subscription_id_idx" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_plan_idx" ON "subscription" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "user_stripe_customer_id_idx" ON "user" USING btree ("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "polar_customer_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "polar_subscription_plan_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "polar_subscription_plan_end";