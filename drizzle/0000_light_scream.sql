CREATE TYPE "public"."role" AS ENUM('member', 'publisher');--> statement-breakpoint
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
CREATE TABLE "file" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(25) NOT NULL,
	"description" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"scope_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registry_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "scope" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(25) NOT NULL,
	"org_id" integer,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scope_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "version" (
	"id" serial PRIMARY KEY NOT NULL,
	"registry_id" integer NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "version_registry_id_tag_unique" UNIQUE("registry_id","tag")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_version_id_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org" ADD CONSTRAINT "org_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registry" ADD CONSTRAINT "registry_scope_id_scope_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scope"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope" ADD CONSTRAINT "scope_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope" ADD CONSTRAINT "scope_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_registry_id_registry_id_fk" FOREIGN KEY ("registry_id") REFERENCES "public"."registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registry_name_idx" ON "registry" USING btree ("name");--> statement-breakpoint
CREATE INDEX "scope_name_idx" ON "scope" USING btree ("name");