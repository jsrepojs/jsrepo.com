ALTER TABLE "org" DROP CONSTRAINT "org_name_unique";--> statement-breakpoint
ALTER TABLE "registry" DROP CONSTRAINT "registry_scope_id_name_unique";--> statement-breakpoint
ALTER TABLE "scope" DROP CONSTRAINT "scope_name_unique";--> statement-breakpoint
DROP INDEX "org_name_idx";--> statement-breakpoint
DROP INDEX "registry_name_idx";--> statement-breakpoint
DROP INDEX "scope_name_idx";--> statement-breakpoint
CREATE INDEX "org_courtesy_month_ended_at_idx" ON "org" USING btree ("courtesy_month_ended_at");--> statement-breakpoint
CREATE INDEX "org_member_role_idx" ON "org_members" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "registry_scope_name_unique_idx" ON "registry" USING btree ("scope_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "org_name_idx" ON "org" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "registry_name_idx" ON "registry" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "scope_name_idx" ON "scope" USING btree (lower("name"));