ALTER TABLE "anon_session_code" DROP CONSTRAINT "anon_session_code_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "anon_session_code_user_id_idx";--> statement-breakpoint
ALTER TABLE "anon_session" ALTER COLUMN "expires" SET DEFAULT '2025-05-01 20:20:38.138';--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "anon_session_code" ALTER COLUMN "id" SET DATA TYPE TEXT;--> statement-breakpoint
ALTER TABLE "anon_session_code" ALTER COLUMN "expires" SET DEFAULT '2025-05-01 20:10:38.138';--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anon_session_code_user_id_idx" ON "anon_session_code" USING btree ("user_id");