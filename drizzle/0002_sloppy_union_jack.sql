ALTER TABLE "version" RENAME COLUMN "tag" TO "version";--> statement-breakpoint
ALTER TABLE "version" DROP CONSTRAINT "version_registry_id_tag_unique";--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_registry_id_version_unique" UNIQUE("registry_id","version");