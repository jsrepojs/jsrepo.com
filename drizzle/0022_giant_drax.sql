CREATE TABLE "scope_transfer_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_id" integer NOT NULL,
	"new_org_id" integer,
	"new_user_id" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_new_org_id_org_id_fk" FOREIGN KEY ("new_org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_new_user_id_user_id_fk" FOREIGN KEY ("new_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scope_transfer_request_created_by_id_idx" ON "scope_transfer_request" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "scope_transfer_request_scope_id_idx" ON "scope_transfer_request" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "scope_transfer_request_accepted_at_idx" ON "scope_transfer_request" USING btree ("accepted_at");