ALTER TABLE "version" ADD COLUMN "tag" text;--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_registry_id_tag_unique" UNIQUE("registry_id","tag");