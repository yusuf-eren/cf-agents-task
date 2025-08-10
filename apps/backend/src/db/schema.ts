import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

// Messages table for storing chat messages
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentType: text("agent_type").notNull(), // 'router-agent' or 'campaign-agent'
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing additional message data
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Sessions table for tracking agent sessions
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // Use text ID instead of UUID
  agentType: text("agent_type").notNull(),
  agentName: text("agent_name").notNull(),
  metadata: jsonb("metadata"), // For storing session-specific data
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Tool executions table for tracking tool usage
export const toolExecutions = pgTable("tool_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(),
  toolName: text("tool_name").notNull(),
  input: jsonb("input"), // Tool input parameters
  output: jsonb("output"), // Tool execution result
  status: text("status").notNull(), // 'pending', 'success', 'error'
  executedAt: timestamp("executed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Integration connections table for tracking session integrations
export const integrationConnections = pgTable("integration_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(), // Links to sessions table
  integrationName: text("integration_name").notNull(), // 'google-ads', 'shopify', 'posthog'
  status: text("status").notNull(), // 'connected', 'disconnected', 'error'
  credentials: jsonb("credentials"), // Encrypted API keys/tokens (mock for now)
  metadata: jsonb("metadata"), // Additional connection data
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Prompts table for storing agent-specific system prompts
export const prompts = pgTable("prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentType: text("agent_type").notNull().unique(), // 'router-agent', 'campaign-agent', etc.
  prompt: text("prompt").notNull(), // The system prompt content
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type ToolExecution = typeof toolExecutions.$inferSelect;
export type NewToolExecution = typeof toolExecutions.$inferInsert;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type NewIntegrationConnection =
  typeof integrationConnections.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
