ALTER TABLE "registry" RENAME COLUMN "team_price" TO "org_price";--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" DROP CONSTRAINT "daily_registry_fetch_scope_id_registry_id_version_id_file_name_";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "account_user_id_idx";--> statement-breakpoint
DROP INDEX "scope_name_idx";--> statement-breakpoint
DROP INDEX "scope_org_id_idx";--> statement-breakpoint
DROP INDEX "scope_user_id_idx";--> statement-breakpoint
DROP INDEX "daily_registry_fetch_count_idx";--> statement-breakpoint
DROP INDEX "daily_registry_fetch_day_idx";--> statement-breakpoint
DROP INDEX "daily_registry_fetch_file_name_idx";--> statement-breakpoint
DROP INDEX "daily_registry_fetch_registry_id_idx";--> statement-breakpoint
DROP INDEX "daily_registry_fetch_scope_id_idx";--> statement-breakpoint
DROP INDEX "daily_registry_fetch_version_id_idx";--> statement-breakpoint
DROP INDEX "version_registry_id_idx";--> statement-breakpoint
DROP INDEX "version_tag_idx";--> statement-breakpoint
DROP INDEX "version_version_idx";--> statement-breakpoint
DROP INDEX "file_name_idx";--> statement-breakpoint
DROP INDEX "file_version_id_idx";--> statement-breakpoint
DROP INDEX "scope_transfer_request_accepted_at_idx";--> statement-breakpoint
DROP INDEX "scope_transfer_request_created_by_id_idx";--> statement-breakpoint
DROP INDEX "scope_transfer_request_scope_id_idx";--> statement-breakpoint
DROP INDEX "session_token_idx";--> statement-breakpoint
DROP INDEX "session_user_id_idx";--> statement-breakpoint
DROP INDEX "org_courtesy_month_ended_at_idx";--> statement-breakpoint
DROP INDEX "org_name_idx";--> statement-breakpoint
DROP INDEX "org_member_org_id_idx";--> statement-breakpoint
DROP INDEX "org_member_role_idx";--> statement-breakpoint
DROP INDEX "org_member_user_id_idx";--> statement-breakpoint
DROP INDEX "subscription_customer_id_idx";--> statement-breakpoint
DROP INDEX "subscription_plan_idx";--> statement-breakpoint
DROP INDEX "subscription_reference_id_idx";--> statement-breakpoint
DROP INDEX "subscription_subscription_id_idx";--> statement-breakpoint
DROP INDEX "user_email_idx";--> statement-breakpoint
DROP INDEX "user_stripe_customer_id_idx";--> statement-breakpoint
DROP INDEX "user_username_idx";--> statement-breakpoint
DROP INDEX "anon_session_code_session_id_idx";--> statement-breakpoint
DROP INDEX "anon_session_code_user_id_idx";--> statement-breakpoint
DROP INDEX "apikey_device_hardware_id_idx";--> statement-breakpoint
DROP INDEX "apikey_device_session_id_idx";--> statement-breakpoint
DROP INDEX "apikey_key_idx";--> statement-breakpoint
DROP INDEX "org_invites_org_id_idx";--> statement-breakpoint
DROP INDEX "org_invites_user_id_idx";--> statement-breakpoint
DROP INDEX "common_name_ban_name_idx";--> statement-breakpoint
DROP INDEX "marketplace_purchase_reference_id_idx";--> statement-breakpoint
DROP INDEX "marketplace_purchase_registry_id_idx";--> statement-breakpoint
DROP INDEX "marketplace_purchase_status_idx";--> statement-breakpoint
DROP INDEX "marketplace_purchase_stripe_purchase_intent_id_idx";--> statement-breakpoint
DROP INDEX "marketplace_stripe_customer_id_idx";--> statement-breakpoint
DROP INDEX "registry_access_idx";--> statement-breakpoint
DROP INDEX "registry_meta_authors";--> statement-breakpoint
DROP INDEX "registry_meta_description";--> statement-breakpoint
DROP INDEX "registry_meta_primary_language";--> statement-breakpoint
DROP INDEX "registry_meta_tags";--> statement-breakpoint
DROP INDEX "registry_name_idx";--> statement-breakpoint
DROP INDEX "registry_scope_name_unique_idx";--> statement-breakpoint
ALTER TABLE "subscription" drop column "has_enough_seats";--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "has_enough_seats" boolean GENERATED ALWAYS AS (COALESCE("subscription"."seats" >= ("subscription"."org_members" - 1), false)) STORED NOT NULL;--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scope_name_idx" ON "scope" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "scope_org_id_idx" ON "scope" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "scope_user_id_idx" ON "scope" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_count_idx" ON "daily_registry_fetch" USING btree ("count");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_day_idx" ON "daily_registry_fetch" USING btree ("day");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_file_name_idx" ON "daily_registry_fetch" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_registry_id_idx" ON "daily_registry_fetch" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_scope_id_idx" ON "daily_registry_fetch" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_version_id_idx" ON "daily_registry_fetch" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "version_registry_id_idx" ON "version" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "version_tag_idx" ON "version" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "version_version_idx" ON "version" USING btree ("version");--> statement-breakpoint
CREATE INDEX "file_name_idx" ON "file" USING btree ("name");--> statement-breakpoint
CREATE INDEX "file_version_id_idx" ON "file" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "scope_transfer_request_accepted_at_idx" ON "scope_transfer_request" USING btree ("accepted_at");--> statement-breakpoint
CREATE INDEX "scope_transfer_request_created_by_id_idx" ON "scope_transfer_request" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "scope_transfer_request_scope_id_idx" ON "scope_transfer_request" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_courtesy_month_ended_at_idx" ON "org" USING btree ("courtesy_month_ended_at");--> statement-breakpoint
CREATE UNIQUE INDEX "org_name_idx" ON "org" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "org_member_org_id_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_member_role_idx" ON "org_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "org_member_user_id_idx" ON "org_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_customer_id_idx" ON "subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_plan_idx" ON "subscription" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_subscription_id_idx" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_stripe_customer_id_idx" ON "user" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "user_username_idx" ON "user" USING btree ("username");--> statement-breakpoint
CREATE INDEX "anon_session_code_session_id_idx" ON "anon_session_code" USING btree ("anon_session_id");--> statement-breakpoint
CREATE INDEX "anon_session_code_user_id_idx" ON "anon_session_code" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_device_hardware_id_idx" ON "apikey" USING btree ("device_hardware_id");--> statement-breakpoint
CREATE INDEX "apikey_device_session_id_idx" ON "apikey" USING btree ("device_session_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "org_invites_org_id_idx" ON "org_invites" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_invites_user_id_idx" ON "org_invites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "common_name_ban_name_idx" ON "common_name_ban" USING btree ("name");--> statement-breakpoint
CREATE INDEX "marketplace_purchase_reference_id_idx" ON "marketplace_purchase" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "marketplace_purchase_registry_id_idx" ON "marketplace_purchase" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "marketplace_purchase_status_idx" ON "marketplace_purchase" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketplace_purchase_stripe_purchase_intent_id_idx" ON "marketplace_purchase" USING btree ("stripe_purchase_intent_id");--> statement-breakpoint
CREATE INDEX "marketplace_stripe_customer_id_idx" ON "marketplace_purchase" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "registry_access_idx" ON "registry" USING btree ("access");--> statement-breakpoint
CREATE INDEX "registry_meta_authors" ON "registry" USING btree ("meta_authors");--> statement-breakpoint
CREATE INDEX "registry_meta_description" ON "registry" USING btree ("meta_description");--> statement-breakpoint
CREATE INDEX "registry_meta_primary_language" ON "registry" USING btree ("meta_primary_language");--> statement-breakpoint
CREATE INDEX "registry_meta_tags" ON "registry" USING btree ("meta_tags");--> statement-breakpoint
CREATE INDEX "registry_name_idx" ON "registry" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "registry_scope_name_unique_idx" ON "registry" USING btree ("scope_id",lower("name"));--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_scope_id_registry_id_version_id_file_name_day_unique" UNIQUE("scope_id","registry_id","version_id","file_name","day");