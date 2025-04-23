ALTER TABLE "registry" DROP CONSTRAINT "registry_name_unique";--> statement-breakpoint
ALTER TABLE "registry" ADD CONSTRAINT "registry_scope_id_name_unique" UNIQUE("scope_id","name");