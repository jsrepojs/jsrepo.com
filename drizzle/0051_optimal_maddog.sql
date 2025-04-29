ALTER TABLE "subscription" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "trialStart";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "trialEnd";