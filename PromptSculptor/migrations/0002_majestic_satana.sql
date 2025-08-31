ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "email_unique_active_idx" ON "users" USING btree ("email") WHERE "users"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "username_unique_active_idx" ON "users" USING btree ("username") WHERE "users"."is_deleted" = false;