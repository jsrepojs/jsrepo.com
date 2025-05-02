CREATE TABLE "anon_session" (
	"id" text PRIMARY KEY NOT NULL,
	"hardware_id" text NOT NULL,
	"expires" timestamp DEFAULT '2025-05-01 20:23:03.888' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anon_session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "anon_session_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"anon_session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp DEFAULT '2025-05-01 20:13:03.888' NOT NULL,
	"code_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anon_session_code" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_anon_session_id_anon_session_id_fk" FOREIGN KEY ("anon_session_id") REFERENCES "public"."anon_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anon_session_code_session_id_idx" ON "anon_session_code" USING btree ("anon_session_id");--> statement-breakpoint
CREATE INDEX "anon_session_code_user_id_idx" ON "anon_session_code" USING btree ("user_id");