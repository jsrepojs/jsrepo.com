ALTER TABLE "org" RENAME COLUMN "user_id" TO "owner_id";--> statement-breakpoint
ALTER TABLE "org" DROP CONSTRAINT "org_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "org" ADD CONSTRAINT "org_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_version_id_idx" ON "file" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "org_name_idx" ON "org" USING btree ("name");--> statement-breakpoint
CREATE INDEX "org_owner_id_idx" ON "org" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "org_member_org_id_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_member_user_id_idx" ON "org_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registry_private_idx" ON "registry" USING btree ("private");--> statement-breakpoint
CREATE INDEX "scope_org_id_idx" ON "scope" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "scope_user_id_idx" ON "scope" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "version_registry_id_idx" ON "version" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "version_version_idx" ON "version" USING btree ("version");--> statement-breakpoint
CREATE INDEX "version_tag_idx" ON "version" USING btree ("tag");