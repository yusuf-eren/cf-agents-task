import { eq, desc, and } from "drizzle-orm";
import type { DB } from "./index";
import {
  messages,
  sessions,
  toolExecutions,
  integrationConnections,
  prompts,
  type NewMessage,
  type NewSession,
  type NewToolExecution,
  type NewIntegrationConnection,
  type NewPrompt,
} from "./schema";

export class DbOperations {
  constructor(private db: DB) {}

  // Session operations
  async createSession(data: NewSession) {
    // Simple retry mechanism for database connection issues
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const [session] = await this.db
          .insert(sessions)
          .values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: sessions.id,
            set: {
              updatedAt: new Date(),
              metadata: data.metadata,
            },
          })
          .returning();
        return session;
      } catch (error: any) {
        console.warn(
          `Error creating session (attempt ${attempt}/${maxRetries}):`,
          error?.message || error
        );

        // If it's a connection error and we have retries left, wait and try again
        if (
          attempt < maxRetries &&
          (error?.code === "CONNECTION_ENDED" ||
            error?.errno === "CONNECTION_ENDED")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Progressive delay
          continue;
        }

        // If it's the last attempt or a different error, return null
        console.error("Final error creating session:", error);
        return null;
      }
    }

    return null;
  }

  async findSession(sessionId: string) {
    return await this.db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
  }

  async updateSessionMetadata(sessionId: string, metadata: any) {
    const [updated] = await this.db
      .update(sessions)
      .set({
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId))
      .returning();
    return updated;
  }

  // Message operations
  async saveMessage(data: NewMessage) {
    try {
      const [message] = await this.db
        .insert(messages)
        .values({
          ...data,
          createdAt: new Date(),
        })
        .returning();
      return message;
    } catch (error) {
      console.error("Error saving message:", error);
      return null;
    }
  }

  async getSessionMessages(sessionId: string) {
    return await this.db.query.messages.findMany({
      where: eq(messages.sessionId, sessionId),
      orderBy: [desc(messages.createdAt)],
    });
  }

  async getAgentMessages(agentType: string, limit: number = 100) {
    // Add retry logic for database connection issues
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.db.query.messages.findMany({
          where: eq(messages.agentType, agentType),
          orderBy: [desc(messages.createdAt)],
          limit,
        });
      } catch (error: any) {
        console.warn(
          `Error getting agent messages (attempt ${attempt}/${maxRetries}):`,
          error?.message || error
        );

        // If it's a connection error and we have retries left, wait and try again
        if (
          attempt < maxRetries &&
          (error?.code === "CONNECTION_ENDED" ||
            error?.errno === "CONNECTION_ENDED")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          continue;
        }

        // If it's the last attempt or a different error, throw
        throw error;
      }
    }

    return []; // Fallback empty array
  }

  // Tool execution operations
  async logToolExecution(data: NewToolExecution) {
    try {
      const [execution] = await this.db
        .insert(toolExecutions)
        .values({
          ...data,
          executedAt: new Date(),
        })
        .returning();
      return execution;
    } catch (error) {
      console.error("Error logging tool execution:", error);
      return null;
    }
  }

  async updateToolExecution(id: string, output: any, status: string) {
    const [updated] = await this.db
      .update(toolExecutions)
      .set({
        output,
        status,
      })
      .where(eq(toolExecutions.id, id))
      .returning();
    return updated;
  }

  async getSessionToolExecutions(sessionId: string) {
    return await this.db.query.toolExecutions.findMany({
      where: eq(toolExecutions.sessionId, sessionId),
      orderBy: [desc(toolExecutions.executedAt)],
    });
  }

  // Cleanup operations
  async deleteOldMessages(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return await this.db
      .delete(messages)
      .where(eq(messages.createdAt, cutoffDate));
  }

  async deleteSession(sessionId: string) {
    return await this.db.transaction(async (tx) => {
      // Delete all messages for this session
      await tx.delete(messages).where(eq(messages.sessionId, sessionId));
      // Delete all tool executions for this session
      await tx
        .delete(toolExecutions)
        .where(eq(toolExecutions.sessionId, sessionId));
      // Delete the session itself
      await tx.delete(sessions).where(eq(sessions.id, sessionId));
    });
  }

  // Integration operations
  async saveIntegrationConnection(connection: NewIntegrationConnection) {
    return await this.db
      .insert(integrationConnections)
      .values(connection)
      .returning();
  }

  async getIntegrationConnection(sessionId: string, integrationName: string) {
    return await this.db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.sessionId, sessionId),
          eq(integrationConnections.integrationName, integrationName)
        )
      )
      .limit(1);
  }

  async getSessionIntegrations(sessionId: string) {
    return await this.db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.sessionId, sessionId))
      .orderBy(desc(integrationConnections.createdAt));
  }

  async updateIntegrationConnection(
    sessionId: string,
    integrationName: string,
    updates: Partial<NewIntegrationConnection>
  ) {
    return await this.db
      .update(integrationConnections)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationConnections.sessionId, sessionId),
          eq(integrationConnections.integrationName, integrationName)
        )
      )
      .returning();
  }

  async connectIntegration(
    sessionId: string,
    integrationName: string,
    metadata?: any
  ) {
    const [existing] = await this.getIntegrationConnection(
      sessionId,
      integrationName
    );

    if (existing) {
      // Update existing connection
      return await this.updateIntegrationConnection(
        sessionId,
        integrationName,
        {
          status: "connected",
          lastSyncAt: new Date(),
          metadata,
        }
      );
    } else {
      // Create new connection
      return await this.saveIntegrationConnection({
        sessionId,
        integrationName,
        status: "connected",
        lastSyncAt: new Date(),
        metadata,
      });
    }
  }

  async disconnectIntegration(sessionId: string, integrationName: string) {
    return await this.db
      .update(integrationConnections)
      .set({
        status: "disconnected",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationConnections.sessionId, sessionId),
          eq(integrationConnections.integrationName, integrationName)
        )
      )
      .returning();
  }

  async getPromptByAgentType(agentType: string) {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const [prompt] = await this.db
          .select()
          .from(prompts)
          .where(eq(prompts.agentType, agentType))
          .limit(1);

        return prompt || null;
      } catch (error: any) {
        console.warn(
          `Error getting prompt (attempt ${attempt}/${maxRetries}):`,
          error?.message || error
        );

        // If it's a connection error and we have retries left, wait and try again
        if (
          attempt < maxRetries &&
          (error?.code === "CONNECTION_ENDED" ||
            error?.errno === "CONNECTION_ENDED")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          continue;
        }

        // If it's the last attempt or a different error, return null
        console.error("Final error getting prompt:", error);
        return null;
      }
    }

    return null;
  }

  async createOrUpdatePrompt(data: NewPrompt) {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const [prompt] = await this.db
          .insert(prompts)
          .values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: prompts.agentType,
            set: {
              prompt: data.prompt,
              updatedAt: new Date(),
            },
          })
          .returning();
        return prompt;
      } catch (error: any) {
        console.warn(
          `Error creating/updating prompt (attempt ${attempt}/${maxRetries}):`,
          error?.message || error
        );

        // If it's a connection error and we have retries left, wait and try again
        if (
          attempt < maxRetries &&
          (error?.code === "CONNECTION_ENDED" ||
            error?.errno === "CONNECTION_ENDED")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          continue;
        }

        // If it's the last attempt or a different error, return null
        console.error("Final error creating/updating prompt:", error);
        return null;
      }
    }

    return null;
  }

  async getAllPrompts() {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.db.select().from(prompts).orderBy(prompts.agentType);
      } catch (error: any) {
        console.warn(
          `Error getting all prompts (attempt ${attempt}/${maxRetries}):`,
          error?.message || error
        );

        // If it's a connection error and we have retries left, wait and try again
        if (
          attempt < maxRetries &&
          (error?.code === "CONNECTION_ENDED" ||
            error?.errno === "CONNECTION_ENDED")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
          continue;
        }

        // If it's the last attempt or a different error, throw
        throw error;
      }
    }

    return [];
  }
}
