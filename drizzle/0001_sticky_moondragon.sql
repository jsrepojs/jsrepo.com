ALTER TABLE "org" DROP CONSTRAINT "org_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "org_invites" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."org_roll";--> statement-breakpoint
CREATE TYPE "public"."org_roll" AS ENUM('member', 'publisher', 'owner');--> statement-breakpoint
ALTER TABLE "org_invites" ALTER COLUMN "role" SET DATA TYPE "public"."org_roll" USING "role"::"public"."org_roll";--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "role" SET DATA TYPE "public"."org_roll" USING "role"::"public"."org_roll";--> statement-breakpoint
DROP INDEX "org_owner_id_idx";--> statement-breakpoint
ALTER TABLE "org" DROP COLUMN "owner_id";