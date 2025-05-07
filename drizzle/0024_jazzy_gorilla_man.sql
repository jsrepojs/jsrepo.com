CREATE INDEX "marketplace_purchase_stripe_purchase_intent_id_idx" ON "marketplace_purchase" USING btree ("stripe_purchase_intent_id");--> statement-breakpoint
CREATE INDEX "marketplace_purchase_reference_id_idx" ON "marketplace_purchase" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "marketplace_purchase_registry_id_idx" ON "marketplace_purchase" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "marketplace_purchase_status_idx" ON "marketplace_purchase" USING btree ("status");--> statement-breakpoint
CREATE INDEX "marketplace_stripe_customer_id_idx" ON "marketplace_purchase" USING btree ("stripe_customer_id");