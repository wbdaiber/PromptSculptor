-- Add soft delete columns
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Ensure existing users are marked as active
UPDATE users SET 
  is_deleted = false, 
  deleted_at = NULL 
WHERE deleted_at IS NULL;--> statement-breakpoint

-- Create composite index for performance
CREATE INDEX "email_active_idx" ON "users" USING btree ("email","is_deleted");--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "users" USING btree ("deleted_at");