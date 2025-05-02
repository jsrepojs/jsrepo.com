CREATE TYPE "public"."org_roll" AS ENUM('member', 'publisher', 'collaborator');--> statement-breakpoint
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
	"metadata" text
);
--> statement-breakpoint
ALTER TABLE "apikey" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_registry_fetch" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_id" integer NOT NULL,
	"registry_id" integer NOT NULL,
	"version_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"count" integer NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "daily_registry_fetch_scope_id_registry_id_version_id_file_name_day_unique" UNIQUE("scope_id","registry_id","version_id","file_name","day")
);
--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(20) NOT NULL,
	"description" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "org" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "org_roll" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"rejected_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "org_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "org_roll" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(20) NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"scope_id" integer NOT NULL,
	"meta_authors" text[],
	"meta_bugs" text,
	"meta_description" text,
	"meta_homepage" text,
	"meta_repository" text,
	"meta_tags" text[],
	"meta_primary_language" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registry_scope_id_name_unique" UNIQUE("scope_id","name")
);
--> statement-breakpoint
ALTER TABLE "registry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scope" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(20) NOT NULL,
	"org_id" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scope_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "scope" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
	"seats" integer
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
	"has_been_delinquent" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_registry_fetch" ADD CONSTRAINT "daily_registry_fetch_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org" ADD CONSTRAINT "org_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_email_user_email_fk" FOREIGN KEY ("email") REFERENCES "public"."user"("email") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registry" ADD CONSTRAINT "registry_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope" ADD CONSTRAINT "scope_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope" ADD CONSTRAINT "scope_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_new_org_id_org_id_fk" FOREIGN KEY ("new_org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_new_user_id_user_id_fk" FOREIGN KEY ("new_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_old_org_id_org_id_fk" FOREIGN KEY ("old_org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_old_user_id_user_id_fk" FOREIGN KEY ("old_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_transfer_request" ADD CONSTRAINT "scope_transfer_request_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_impersonated_by_user_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_released_by_id_user_id_fk" FOREIGN KEY ("released_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_scope_id_idx" ON "daily_registry_fetch" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_registry_id_idx" ON "daily_registry_fetch" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_version_id_idx" ON "daily_registry_fetch" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_file_name_idx" ON "daily_registry_fetch" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_count_idx" ON "daily_registry_fetch" USING btree ("count");--> statement-breakpoint
CREATE INDEX "daily_registry_fetch_day_idx" ON "daily_registry_fetch" USING btree ("day");--> statement-breakpoint
CREATE INDEX "file_name_idx" ON "file" USING btree ("name");--> statement-breakpoint
CREATE INDEX "file_version_id_idx" ON "file" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "org_name_idx" ON "org" USING btree ("name");--> statement-breakpoint
CREATE INDEX "org_owner_id_idx" ON "org" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "org_invites_email_idx" ON "org_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "org_invites_org_id_idx" ON "org_invites" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_member_org_id_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_member_user_id_idx" ON "org_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registry_name_idx" ON "registry" USING btree ("name");--> statement-breakpoint
CREATE INDEX "registry_private_idx" ON "registry" USING btree ("private");--> statement-breakpoint
CREATE INDEX "registry_meta_description" ON "registry" USING btree ("meta_description");--> statement-breakpoint
CREATE INDEX "registry_meta_tags" ON "registry" USING btree ("meta_tags");--> statement-breakpoint
CREATE INDEX "registry_meta_authors" ON "registry" USING btree ("meta_authors");--> statement-breakpoint
CREATE INDEX "registry_meta_primary_language" ON "registry" USING btree ("meta_primary_language");--> statement-breakpoint
CREATE INDEX "scope_name_idx" ON "scope" USING btree ("name");--> statement-breakpoint
CREATE INDEX "scope_org_id_idx" ON "scope" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "scope_user_id_idx" ON "scope" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scope_transfer_request_created_by_id_idx" ON "scope_transfer_request" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "scope_transfer_request_scope_id_idx" ON "scope_transfer_request" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "scope_transfer_request_accepted_at_idx" ON "scope_transfer_request" USING btree ("accepted_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_customer_id_idx" ON "subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_subscription_id_idx" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_plan_idx" ON "subscription" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_stripe_customer_id_idx" ON "user" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "version_registry_id_idx" ON "version" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "version_version_idx" ON "version" USING btree ("version");--> statement-breakpoint
CREATE INDEX "version_tag_idx" ON "version" USING btree ("tag");