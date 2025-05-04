CREATE TABLE "owner_identifier" (
	"name" varchar(50) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owner_identifier" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "org" ALTER COLUMN "name" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "org" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" varchar(50);--> statement-breakpoint
ALTER TABLE "org" ADD CONSTRAINT "org_name_owner_identifier_name_fk" FOREIGN KEY ("name") REFERENCES "public"."owner_identifier"("name") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_owner_identifier_name_fk" FOREIGN KEY ("username") REFERENCES "public"."owner_identifier"("name") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "user_username_idx" ON "user" USING btree ("username");--> statement-breakpoint
ALTER TABLE "org" ADD CONSTRAINT "org_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");