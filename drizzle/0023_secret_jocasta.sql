ALTER TABLE "scope_transfer_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD COLUMN "old_org_id" integer;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD COLUMN "old_user_id" text;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_old_org_id_org_id_fk" FOREIGN KEY ("old_org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_old_user_id_user_id_fk" FOREIGN KEY ("old_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;