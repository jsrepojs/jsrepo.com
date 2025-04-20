ALTER TABLE "version" RENAME COLUMN "user_id" TO "released_by_id";--> statement-breakpoint
ALTER TABLE "version" DROP CONSTRAINT "version_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "version" ADD CONSTRAINT "version_released_by_id_user_id_fk" FOREIGN KEY ("released_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;