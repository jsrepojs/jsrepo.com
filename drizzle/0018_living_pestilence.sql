CREATE TYPE "public"."registry_access" AS ENUM('public', 'private', 'marketplace');--> statement-breakpoint
ALTER TABLE "registry" ADD COLUMN "access" "registry_access";