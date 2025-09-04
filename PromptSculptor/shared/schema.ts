import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  deletedAt: timestamp("deleted_at"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Performance optimization: composite index for email lookups
  emailActiveIdx: index("email_active_idx").on(table.email, table.isDeleted),
  // Partial unique index - only enforce uniqueness for non-deleted users
  emailUniqueActiveIdx: index("email_unique_active_idx").on(table.email).where(sql`${table.isDeleted} = false`),
  usernameUniqueActiveIdx: index("username_unique_active_idx").on(table.username).where(sql`${table.isDeleted} = false`),
}));

// User API keys table for encrypted storage of user's API keys
export const userApiKeys = pgTable("user_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  service: text("service").notNull(), // 'openai', 'anthropic', 'gemini'
  encryptedKey: text("encrypted_key").notNull(),
  keyName: text("key_name"), // Optional user-friendly name
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for API adoption metrics and admin analytics
  userIdIdx: index("user_api_keys_user_id_idx").on(table.userId),
}));

// Password reset tokens table for secure password recovery
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull(), // Hashed token
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for token validation and lookup performance
  tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
  // Index for user tokens lookup
  userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
  // Index for cleanup operations and security monitoring
  expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
}));

// Updated prompts table with user relationship
export const prompts = pgTable("prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  naturalLanguageInput: text("natural_language_input").notNull(),
  generatedPrompt: text("generated_prompt").notNull(),
  templateType: text("template_type").notNull(), // 'analysis', 'writing', 'coding', 'custom'
  targetModel: text("target_model").notNull().default('claude'), // 'claude', 'gpt', 'gemini'
  complexityLevel: text("complexity_level").notNull().default('detailed'), // 'simple', 'detailed', 'comprehensive'
  includeExamples: boolean("include_examples").notNull().default(true),
  useXMLTags: boolean("use_xml_tags").notNull().default(true),
  includeConstraints: boolean("include_constraints").notNull().default(false),
  wordCount: integer("word_count").notNull().default(0),
  isFavorite: boolean("is_favorite").notNull().default(false),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Optional for backward compatibility
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Index for user's prompts queries ordered by creation time (admin analytics)
  userIdCreatedIdx: index("prompts_user_id_created_idx").on(table.userId, table.createdAt),
  // Index for favorite prompts filtering (admin analytics)
  userIdFavoriteIdx: index("prompts_user_favorite_idx").on(table.userId, table.isFavorite).where(sql`${table.isFavorite} = true`),
  // Index for template type filtering (admin analytics)
  templateTypeIdx: index("prompts_template_type_idx").on(table.templateType),
}));

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 100 }), // Stable identifier for default templates
  name: text("name").notNull(),
  type: text("type").notNull(), // 'analysis', 'writing', 'coding', 'custom'
  description: text("description").notNull(),
  icon: text("icon").notNull(), // Font Awesome icon class
  iconColor: text("icon_color").notNull(), // Tailwind color class
  sampleInput: text("sample_input").notNull(),
  promptStructure: jsonb("prompt_structure").notNull(), // JSON structure for prompt generation
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // null for default system templates
  isDefault: boolean("is_default").notNull().default(false), // true for system templates
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint on slug for default templates only
  slugUniqueIdx: uniqueIndex("uq_default_template_slug").on(table.slug).where(sql`is_default = true`),
  // Index for faster slug queries
  slugIdx: index("idx_template_slug").on(table.slug),
  // Index for template type and default queries (admin analytics)
  typeDefaultIdx: index("templates_type_default_idx").on(table.type, table.isDefault),
  // Index for user templates ordered by creation
  userIdCreatedIdx: index("templates_user_id_created_idx").on(table.userId, table.createdAt),
}));

// Zod schemas for database operations
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserApiKeySchema = createInsertSchema(userApiKeys).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUserApiKey = z.infer<typeof insertUserApiKeySchema>;
export type UserApiKey = typeof userApiKeys.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export const generatePromptRequestSchema = z.object({
  naturalLanguageInput: z.string().min(10).max(7500),
  templateType: z.enum(['analysis', 'writing', 'coding', 'custom']),
  targetModel: z.enum(['claude', 'gpt', 'gemini']),
  complexityLevel: z.enum(['simple', 'detailed', 'comprehensive']),
  includeExamples: z.boolean(),
  useXMLTags: z.boolean(),
  includeConstraints: z.boolean(),
});

export type GeneratePromptRequest = z.infer<typeof generatePromptRequestSchema>;

// Password reset request schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;


// Session storage table for OAuth admin authentication
export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => ({
  // Index for session cleanup operations
  expireIdx: index("user_sessions_expire_idx").on(table.expire),
}));

// Session table TypeScript types
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
