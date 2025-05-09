-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."org_roll" AS ENUM('member', 'publisher', 'owner');--> statement-breakpoint
CREATE TYPE "public"."registry_access" AS ENUM('public', 'private', 'marketplace');--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scope" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(20) NOT NULL,
	"org_id" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scope" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_registry_fetch" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_id" integer NOT NULL,
	"registry_id" integer NOT NULL,
	"version_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"count" integer NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "daily_registry_fetch_scope_id_registry_id_version_id_file_name_" UNIQUE("scope_id","registry_id","version_id","file_name","day")
);
--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "version" (
	"id" serial PRIMARY KEY NOT NULL,
	"registry_id" integer NOT NULL,
	"version" text NOT NULL,
	"tag" text,
	"released_by_id" text NOT NULL,
	"has_readme" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "version_registry_id_version_unique" UNIQUE("registry_id","version"),
	CONSTRAINT "version_registry_id_tag_unique" UNIQUE("registry_id","tag")
);
--> statement-breakpoint
ALTER TABLE "version" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scope_transfer_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_id" integer NOT NULL,
	"new_org_id" text,
	"new_user_id" text,
	"old_org_id" text,
	"old_user_id" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"courtesy_month_started_at" timestamp,
	"courtesy_month_ended_at" timestamp,
	"members" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "org_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "org" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "org_roll" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"cancel_at_period_end" boolean,
	"seats" integer,
	"org_members" integer,
	"has_enough_seats" boolean GENERATED ALWAYS AS (COALESCE((seats >= (org_members - 1)), false)) STORED NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"scopeLimit" integer DEFAULT 5 NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"bar_reason" text,
	"bar_expires" timestamp,
	"stripe_customer_id" text,
	"username" varchar(50),
	"stripe_seller_account_id" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "anon_session_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"anon_session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anon_session_code" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "anon_session" (
	"id" text PRIMARY KEY NOT NULL,
	"hardware_id" text NOT NULL,
	"expires" timestamp NOT NULL,
	"authorized_to_user_id" text
);
--> statement-breakpoint
ALTER TABLE "anon_session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean,
	"rate_limit_enabled" boolean,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text,
	"device_session_id" text,
	"device_activated" boolean,
	"device_hardware_id" text,
	"must_be_activated_before" timestamp,
	"device_temp_api_key" text
);
--> statement-breakpoint
ALTER TABLE "apikey" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "owner_identifier" (
	"name" varchar(50) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owner_identifier" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"role" "org_roll" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "common_name_ban" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "common_name_ban" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "marketplace_purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_purchase_intent_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"reference_id" text NOT NULL,
	"registry_id" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_purchase_stripe_purchase_intent_id_unique" UNIQUE("stripe_purchase_intent_id")
);
--> statement-breakpoint
ALTER TABLE "marketplace_purchase" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(20) NOT NULL,
	"scope_id" integer NOT NULL,
	"meta_authors" text[],
	"meta_bugs" text,
	"meta_description" text,
	"meta_homepage" text,
	"meta_repository" text,
	"meta_tags" text[],
	"meta_primary_language" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"access" "registry_access" NOT NULL,
	"list_on_marketplace" boolean DEFAULT false,
	"individual_price" integer,
	"team_price" integer
);
--> statement-breakpoint
ALTER TABLE "registry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope" ADD CONSTRAINT "scope_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope" ADD CONSTRAINT "scope_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_released_by_id_user_id_fk" FOREIGN KEY ("released_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_new_org_id_org_id_fk" FOREIGN KEY ("new_org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_new_user_id_user_id_fk" FOREIGN KEY ("new_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_old_org_id_org_id_fk" FOREIGN KEY ("old_org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_old_user_id_user_id_fk" FOREIGN KEY ("old_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_impersonated_by_user_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org" ADD CONSTRAINT "org_name_owner_identifier_name_fk" FOREIGN KEY ("name") REFERENCES "public"."owner_identifier"("name") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_owner_identifier_name_fk" FOREIGN KEY ("username") REFERENCES "public"."owner_identifier"("name") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_anon_session_id_anon_session_id_fk" FOREIGN KEY ("anon_session_id") REFERENCES "public"."anon_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anon_session_code" ADD CONSTRAINT "anon_session_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anon_session" ADD CONSTRAINT "anon_session_authorized_to_user_id_user_id_fk" FOREIGN KEY ("authorized_to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_purchase" ADD CONSTRAINT "marketplace_purchase_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registry" ADD CONSTRAINT "registry_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier" text_ops);--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "scope_name_idx" ON "scope" USING btree (lower((name)::text) text_ops);--> statement-breakpoint
CREATE INDEX "scope_org_id_idx" ON "scope" USING btree ("org_id" text_ops);--> statement-breakpoint
CREATE INDEX "scope_user_id_idx" ON "scope" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_count_idx" ON "daily_registry_fetch" USING btree ("count" int4_ops);--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_day_idx" ON "daily_registry_fetch" USING btree ("day" date_ops);--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_file_name_idx" ON "daily_registry_fetch" USING btree ("file_name" text_ops);--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_registry_id_idx" ON "daily_registry_fetch" USING btree ("registry_id" int4_ops);--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_scope_id_idx" ON "daily_registry_fetch" USING btree ("scope_id" int4_ops);--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_version_id_idx" ON "daily_registry_fetch" USING btree ("version_id" int4_ops);--> statement-breakpoint
CREATE INDEX "version_registry_id_idx" ON "version" USING btree ("registry_id" int4_ops);--> statement-breakpoint
CREATE INDEX "version_tag_idx" ON "version" USING btree ("tag" text_ops);--> statement-breakpoint
CREATE INDEX "version_version_idx" ON "version" USING btree ("version" text_ops);--> statement-breakpoint
CREATE INDEX "file_name_idx" ON "file" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "file_version_id_idx" ON "file" USING btree ("version_id" int4_ops);--> statement-breakpoint
CREATE INDEX "scope_transfer_request_accepted_at_idx" ON "scope_transfer_request" USING btree ("accepted_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "scope_transfer_request_created_by_id_idx" ON "scope_transfer_request" USING btree ("created_by_id" text_ops);--> statement-breakpoint
CREATE INDEX "scope_transfer_request_scope_id_idx" ON "scope_transfer_request" USING btree ("scope_id" int4_ops);--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "org_courtesy_month_ended_at_idx" ON "org" USING btree ("courtesy_month_ended_at" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "org_name_idx" ON "org" USING btree (lower((name)::text) text_ops);--> statement-breakpoint
CREATE INDEX "org_member_org_id_idx" ON "org_members" USING btree ("org_id" text_ops);--> statement-breakpoint
CREATE INDEX "org_member_role_idx" ON "org_members" USING btree ("role" enum_ops);--> statement-breakpoint
CREATE INDEX "org_member_user_id_idx" ON "org_members" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "subscription_customer_id_idx" ON "subscription" USING btree ("stripe_customer_id" text_ops);--> statement-breakpoint
CREATE INDEX "subscription_plan_idx" ON "subscription" USING btree ("plan" text_ops);--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id" text_ops);--> statement-breakpoint
CREATE INDEX "subscription_subscription_id_idx" ON "subscription" USING btree ("stripe_subscription_id" text_ops);--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "user_stripe_customer_id_idx" ON "user" USING btree ("stripe_customer_id" text_ops);--> statement-breakpoint
CREATE INDEX "user_username_idx" ON "user" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "anon_session_code_session_id_idx" ON "anon_session_code" USING btree ("anon_session_id" text_ops);--> statement-breakpoint
CREATE INDEX "anon_session_code_user_id_idx" ON "anon_session_code" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "apikey_device_hardware_id_idx" ON "apikey" USING btree ("device_hardware_id" text_ops);--> statement-breakpoint
CREATE INDEX "apikey_device_session_id_idx" ON "apikey" USING btree ("device_session_id" text_ops);--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key" text_ops);--> statement-breakpoint
CREATE INDEX "org_invites_org_id_idx" ON "org_invites" USING btree ("org_id" text_ops);--> statement-breakpoint
CREATE INDEX "org_invites_user_id_idx" ON "org_invites" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "common_name_ban_name_idx" ON "common_name_ban" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "marketplace_purchase_reference_id_idx" ON "marketplace_purchase" USING btree ("reference_id" text_ops);--> statement-breakpoint
CREATE INDEX "marketplace_purchase_registry_id_idx" ON "marketplace_purchase" USING btree ("registry_id" int4_ops);--> statement-breakpoint
CREATE INDEX "marketplace_purchase_status_idx" ON "marketplace_purchase" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "marketplace_purchase_stripe_purchase_intent_id_idx" ON "marketplace_purchase" USING btree ("stripe_purchase_intent_id" text_ops);--> statement-breakpoint
CREATE INDEX "marketplace_stripe_customer_id_idx" ON "marketplace_purchase" USING btree ("stripe_customer_id" text_ops);--> statement-breakpoint
CREATE INDEX "registry_access_idx" ON "registry" USING btree ("access" enum_ops);--> statement-breakpoint
CREATE INDEX "registry_meta_authors" ON "registry" USING btree ("meta_authors" array_ops);--> statement-breakpoint
CREATE INDEX "registry_meta_description" ON "registry" USING btree ("meta_description" text_ops);--> statement-breakpoint
CREATE INDEX "registry_meta_primary_language" ON "registry" USING btree ("meta_primary_language" text_ops);--> statement-breakpoint
CREATE INDEX "registry_meta_tags" ON "registry" USING btree ("meta_tags" array_ops);--> statement-breakpoint
CREATE INDEX "registry_name_idx" ON "registry" USING btree (lower((name)::text) text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "registry_scope_name_unique_idx" ON "registry" USING btree (scope_id int4_ops,lower((name)::text) int4_ops);
*/