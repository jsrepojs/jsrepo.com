CREATE INDEX "registry_meta_description" ON "registry" USING btree ("meta_description");--> statement-breakpoint
CREATE INDEX "registry_meta_tags" ON "registry" USING btree ("meta_tags");--> statement-breakpoint
CREATE INDEX "registry_meta_authors" ON "registry" USING btree ("meta_authors");