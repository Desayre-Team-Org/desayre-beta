import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, decimal, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

export const generations = pgTable('generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'image', 'edit', 'video'
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  prompt: text('prompt').notNull(),
  enhancedPrompt: text('enhanced_prompt'),
  modelUsed: varchar('model_used', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 100 }).notNull(),
  resolution: varchar('resolution', { length: 50 }),
  duration: integer('duration'),
  costEstimate: decimal('cost_estimate', { precision: 10, scale: 6 }),
  outputUrl: text('output_url'),
  inputImageUrl: text('input_image_url'),
  metadata: jsonb('metadata'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index('generations_user_id_idx').on(table.userId),
  statusIdx: index('generations_status_idx').on(table.status),
  typeIdx: index('generations_type_idx').on(table.type),
  createdAtIdx: index('generations_created_at_idx').on(table.createdAt),
}));

export const generationLogs = pgTable('generation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  generationId: uuid('generation_id').references(() => generations.id).notNull(),
  level: varchar('level', { length: 50 }).notNull(), // 'info', 'warn', 'error'
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  generationIdIdx: index('logs_generation_id_idx').on(table.generationId),
}));

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 100 }).notNull(),
  isActive: integer('is_active').notNull().default(1),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type GenerationLog = typeof generationLogs.$inferSelect;
export type NewGenerationLog = typeof generationLogs.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
