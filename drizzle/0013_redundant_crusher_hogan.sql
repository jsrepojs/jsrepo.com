ALTER TABLE "anon_session" ADD COLUMN "authorized_to_user_id" text;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "must_be_activated_before" timestamp;--> statement-breakpoint
ALTER TABLE "anon_session" ADD CONSTRAINT "anon_session_authorized_to_user_id_user_id_fk" FOREIGN KEY ("authorized_to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;