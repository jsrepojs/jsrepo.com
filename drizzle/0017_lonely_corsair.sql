ALTER TABLE "org_invites" DROP CONSTRAINT "org_invites_email_user_email_fk";
--> statement-breakpoint
DROP INDEX "org_invites_email_idx";--> statement-breakpoint
ALTER TABLE "org_invites" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_invites_user_id_idx" ON "org_invites" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "org_invites" DROP COLUMN "email";