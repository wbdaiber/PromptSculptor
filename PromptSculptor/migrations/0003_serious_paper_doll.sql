CREATE TABLE "user_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_sessions_expire_idx" ON "user_sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "prompts_user_id_created_idx" ON "prompts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "prompts_user_favorite_idx" ON "prompts" USING btree ("user_id","is_favorite") WHERE "prompts"."is_favorite" = true;--> statement-breakpoint
CREATE INDEX "prompts_template_type_idx" ON "prompts" USING btree ("template_type");--> statement-breakpoint
CREATE INDEX "templates_type_default_idx" ON "templates" USING btree ("type","is_default");--> statement-breakpoint
CREATE INDEX "templates_user_id_created_idx" ON "templates" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_api_keys_user_id_idx" ON "user_api_keys" USING btree ("user_id");