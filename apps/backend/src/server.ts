import { type Connection, routeAgentRequest } from "agents";
import { AIChatAgent } from "agents/ai-chat-agent";
import { createDataStreamResponse, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DatabaseManager } from "./db";
import { DbOperations } from "./db/operations";
import { integrations, getIntegrationStatus, getToolsForAgent } from "./tools";

// ROutingAgent
export class RouterAgent extends AIChatAgent<Env> {
  private dbManager: DatabaseManager | null = null;
  private dbOps: DbOperations | null = null;
  private sessionId: string = "";
  private systemPrompt: string = "";

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    try {
      this.dbManager = new DatabaseManager(
        this.env.HYPERDRIVE.connectionString
      );
      const { db } = this.dbManager.getDb();
      this.dbOps = new DbOperations(db);
      console.log("RouterAgent: Database connection established");
    } catch (error) {
      console.warn("RouterAgent: Database not available:", error);
    }
  }

  async onStart(): Promise<void> {
    console.log("RouterAgent: Starting up");
    await this.loadSystemPrompt();
  }

  async onConnect(connection: Connection): Promise<void> {
    console.log(`RouterAgent connected: ${connection.id}`);

    // Use a persistent session ID that matches frontend format
    // Frontend creates IDs like: router-agent-{suffix} where suffix is from main session
    // We'll use a fixed suffix to ensure consistency across connections
    this.sessionId = `router-agent-persistent`;

    // Create or get existing session in database
    if (this.dbOps) {
      try {
        const session = await this.dbOps.createSession({
          id: this.sessionId,
          agentType: "router-agent",
          agentName: this.sessionId,
          metadata: {
            startedAt: new Date(),
            connectionId: connection.id,
            lastConnectionAt: new Date(),
          },
        });
        if (session) {
          console.log(
            `RouterAgent session ${this.sessionId} created/updated successfully`
          );
        }

        // Restore previous conversation history
        await this.restoreConversationHistory();
      } catch (error) {
        console.warn(
          "Failed to create RouterAgent session (continuing anyway):",
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  private async restoreConversationHistory(): Promise<void> {
    if (!this.dbOps || !this.sessionId) return;

    try {
      // Get previous messages for this agent type
      const savedMessages = await this.dbOps.getAgentMessages(
        "router-agent",
        50
      );

      if (savedMessages.length > 0) {
        console.log(
          `RouterAgent: Restoring ${savedMessages.length} previous messages`
        );

        // Convert database messages to AI SDK format and restore them
        // Sort by creation time (oldest first)
        const sortedMessages = savedMessages.reverse();

        // Clear existing messages and restore from database
        this.messages = [];

        for (const dbMessage of sortedMessages) {
          this.messages.push({
            role: dbMessage.role as "user" | "assistant" | "system",
            content: dbMessage.content,
            id: dbMessage.id,
          });
        }

        console.log(
          `RouterAgent: Successfully restored ${this.messages.length} messages`
        );
      } else {
        console.log(`RouterAgent: No previous conversation history found`);
      }
    } catch (error) {
      console.error(
        "RouterAgent: Failed to restore conversation history:",
        error
      );
      // Continue without history restoration rather than failing completely
      console.log("RouterAgent: Continuing without restored history");
    }
  }

  private async loadSystemPrompt(): Promise<void> {
    if (!this.dbOps) return;

    try {
      // Get system prompt for this agent type from database
      const promptRecord =
        await this.dbOps.getPromptByAgentType("router-agent");

      if (promptRecord && promptRecord.prompt) {
        this.systemPrompt = promptRecord.prompt;
        console.log(
          `RouterAgent: Loaded custom system prompt (${this.systemPrompt.length} chars)`
        );
      } else {
        this.systemPrompt = "";
        console.log(
          `RouterAgent: No prompt found in database, using empty prompt`
        );
      }
    } catch (error) {
      console.error("RouterAgent: Failed to load system prompt:", error);
      this.systemPrompt = "";
      console.log("RouterAgent: Using empty prompt due to error");
    }
  }

  async onClose(connection: Connection): Promise<void> {
    console.log(`RouterAgent disconnected: ${connection.id}`);

    // Save all messages to database before closing
    if (this.dbOps && this.sessionId && this.messages.length > 0) {
      try {
        console.log(
          `RouterAgent: Saving ${this.messages.length} messages to database on close`
        );
        for (const message of this.messages) {
          await this.dbOps.saveMessage({
            agentType: "router-agent",
            sessionId: this.sessionId,
            role: message.role as "user" | "assistant" | "system",
            content:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
            metadata: {
              timestamp: new Date().toISOString(),
              agentName: "RouterAgent",
              savedOnClose: true,
            },
          });
        }
        console.log(`RouterAgent: Successfully saved all messages on close`);
      } catch (error) {
        console.error("RouterAgent: Failed to save messages on close:", error);
      }
    }

    if (this.dbManager) {
      try {
        await this.dbManager.close();
      } catch (error) {
        console.warn("Error closing database connection:", error);
      }
    }
  }

  async onChatMessage(
    onFinish: any,
    options?: { abortSignal?: AbortSignal }
  ): Promise<Response> {
    // Save user message before processing - only if message count > 10
    const userMessage = this.messages[this.messages.length - 1];
    if (
      this.dbOps &&
      this.sessionId &&
      userMessage?.role === "user" &&
      this.messages.length > 10
    ) {
      try {
        const savedMessage = await this.dbOps.saveMessage({
          agentType: "router-agent",
          sessionId: this.sessionId,
          role: "user",
          content: userMessage.content as string,
          metadata: {
            timestamp: new Date().toISOString(),
            agentName: "RouterAgent",
          },
        });
        console.log(`RouterAgent user message saved: ${savedMessage?.id}`);
      } catch (error) {
        console.error("Failed to save user message:", error);
      }
    }

    // Create a streaming response
    return createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          // Initialize OpenAI client
          const openai = createOpenAI({
            apiKey: this.env.OPENAI_API_KEY,
            baseURL: this.env.GATEWAY_BASE_URL,
          });

          // Get tools for this agent based on connected integrations
          const tools = await getToolsForAgent(
            "router-agent",
            this.sessionId,
            this.dbOps
          );

          // Debug: Log available tools
          console.log("RouterAgent available tools:", Object.keys(tools));

          // Stream the AI response
          const result = streamText({
            model: openai("gpt-4o"),
            system: this.systemPrompt,
            messages: this.messages,
            tools,
            onFinish: async (result) => {
              // Save assistant response after completion - only if message count > 10
              if (this.dbOps && this.sessionId && this.messages.length > 10) {
                try {
                  const savedResponse = await this.dbOps.saveMessage({
                    agentType: "router-agent",
                    sessionId: this.sessionId,
                    role: "assistant",
                    content: result.text,
                    metadata: {
                      timestamp: new Date().toISOString(),
                      agentName: "RouterAgent",
                      responseLength: result.text.length,
                      finishReason: result.finishReason,
                      usage: result.usage,
                    },
                  });
                  console.log(
                    `RouterAgent assistant response saved: ${savedResponse?.id}`
                  );

                  // Update session metadata
                  await this.dbOps.updateSessionMetadata(this.sessionId, {
                    lastActivity: new Date().toISOString(),
                    messageCount: await this.getMessageCount(),
                  });
                } catch (error) {
                  console.error("Failed to save assistant response:", error);
                }
              }

              // Call the original onFinish callback
              if (onFinish) {
                onFinish(result);
              }
            },
            maxSteps: 5,
          });

          // Merge the AI response stream with tool execution outputs
          result.mergeIntoDataStream(dataStream);
        } catch (error) {
          console.error("Error in RouterAgent onChatMessage:", error);
          // Save error message to database - only if message count > 10
          if (this.dbOps && this.sessionId && this.messages.length > 10) {
            try {
              await this.dbOps.saveMessage({
                agentType: "router-agent",
                sessionId: this.sessionId,
                role: "system",
                content: `Error processing message: ${error instanceof Error ? error.message : "Unknown error"}`,
                metadata: {
                  error: true,
                  timestamp: new Date().toISOString(),
                },
              });
            } catch (dbError) {
              console.error("Failed to save error message:", dbError);
            }
          }
          throw error;
        }
      },
    });
  }

  private async getMessageCount(): Promise<number> {
    if (!this.dbOps || !this.sessionId) return 0;
    try {
      const messages = await this.dbOps.getSessionMessages(this.sessionId);
      return messages.length;
    } catch (error) {
      console.warn("Failed to get message count:", error);
      return 0;
    }
  }

  // Tool execution tracking methods
  async logToolStart(toolName: string, input: any): Promise<string | null> {
    if (!this.dbOps || !this.sessionId) return null;
    try {
      const execution = await this.dbOps.logToolExecution({
        sessionId: this.sessionId,
        toolName,
        input,
        status: "pending",
      });
      console.log(`RouterAgent tool execution started: ${execution?.id}`);
      return execution?.id || null;
    } catch (error) {
      console.error("Failed to log tool start:", error);
      return null;
    }
  }

  async logToolComplete(
    executionId: string,
    output: any,
    status: "success" | "error"
  ): Promise<void> {
    if (!this.dbOps || !executionId) return;
    try {
      await this.dbOps.updateToolExecution(executionId, output, status);
      console.log(
        `RouterAgent tool execution completed: ${executionId} with status: ${status}`
      );
    } catch (error) {
      console.error("Failed to log tool completion:", error);
    }
  }

  // Integration management methods
  async connectIntegration(integrationName: string): Promise<boolean> {
    if (!this.dbOps || !this.sessionId) return false;
    try {
      await this.dbOps.connectIntegration(this.sessionId, integrationName, {
        connectedAt: new Date().toISOString(),
        source: "agent",
        agentType: "router-agent",
      });
      console.log(`RouterAgent connected integration: ${integrationName}`);
      return true;
    } catch (error) {
      console.error(`Failed to connect integration ${integrationName}:`, error);
      return false;
    }
  }

  async disconnectIntegration(integrationName: string): Promise<boolean> {
    if (!this.dbOps || !this.sessionId) return false;
    try {
      await this.dbOps.disconnectIntegration(this.sessionId, integrationName);
      console.log(`RouterAgent disconnected integration: ${integrationName}`);
      return true;
    } catch (error) {
      console.error(
        `Failed to disconnect integration ${integrationName}:`,
        error
      );
      return false;
    }
  }
}

export class CampaignAgent extends AIChatAgent<Env> {
  private dbManager: DatabaseManager | null = null;
  private dbOps: DbOperations | null = null;
  private sessionId: string = "";
  private systemPrompt: string = "";

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    try {
      this.dbManager = new DatabaseManager(
        this.env.HYPERDRIVE.connectionString
      );
      const { db } = this.dbManager.getDb();
      this.dbOps = new DbOperations(db);
      console.log("CampaignAgent: Database connection established");
    } catch (error) {
      console.warn("CampaignAgent: Database not available:", error);
    }
  }

  async onStart(): Promise<void> {
    console.log("CampaignAgent: Starting up");
    await this.loadSystemPrompt();
  }

  async onConnect(connection: Connection): Promise<void> {
    console.log(`CampaignAgent connected: ${connection.id}`);

    // Use a persistent session ID that matches frontend format
    // Frontend creates IDs like: campaign-agent-{suffix} where suffix is from main session
    // We'll use a fixed suffix to ensure consistency across connections
    this.sessionId = `campaign-agent-persistent`;

    // Create or get existing session in database
    if (this.dbOps) {
      try {
        const session = await this.dbOps.createSession({
          id: this.sessionId,
          agentType: "campaign-agent",
          agentName: this.sessionId,
          metadata: {
            startedAt: new Date(),
            connectionId: connection.id,
            lastConnectionAt: new Date(),
          },
        });
        if (session) {
          console.log(
            `CampaignAgent session ${this.sessionId} created/updated successfully`
          );
        }

        // Restore previous conversation history
        await this.restoreConversationHistory();
      } catch (error) {
        console.warn(
          "Failed to create CampaignAgent session (continuing anyway):",
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  private async restoreConversationHistory(): Promise<void> {
    if (!this.dbOps || !this.sessionId) return;

    try {
      // Get previous messages for this agent type
      const savedMessages = await this.dbOps.getAgentMessages(
        "campaign-agent",
        50
      );

      if (savedMessages.length > 0) {
        console.log(
          `CampaignAgent: Restoring ${savedMessages.length} previous messages`
        );

        // Convert database messages to AI SDK format and restore them
        // Sort by creation time (oldest first)
        const sortedMessages = savedMessages.reverse();

        // Clear existing messages and restore from database
        this.messages = [];

        for (const dbMessage of sortedMessages) {
          this.messages.push({
            role: dbMessage.role as "user" | "assistant" | "system",
            content: dbMessage.content,
            id: dbMessage.id,
          });
        }

        console.log(
          `CampaignAgent: Successfully restored ${this.messages.length} messages`
        );
      } else {
        console.log(`CampaignAgent: No previous conversation history found`);
      }
    } catch (error) {
      console.error(
        "CampaignAgent: Failed to restore conversation history:",
        error
      );
      // Continue without history restoration rather than failing completely
      console.log("CampaignAgent: Continuing without restored history");
    }
  }

  private async loadSystemPrompt(): Promise<void> {
    if (!this.dbOps) return;

    try {
      // Get system prompt for this agent type from database
      const promptRecord =
        await this.dbOps.getPromptByAgentType("campaign-agent");

      if (promptRecord && promptRecord.prompt) {
        this.systemPrompt = promptRecord.prompt;
        console.log(
          `CampaignAgent: Loaded custom system prompt (${this.systemPrompt.length} chars)`
        );
      } else {
        this.systemPrompt = "";
        console.log(
          `CampaignAgent: No prompt found in database, using empty prompt`
        );
      }
    } catch (error) {
      console.error("CampaignAgent: Failed to load system prompt:", error);
      this.systemPrompt = "";
      console.log("CampaignAgent: Using empty prompt due to error");
    }
  }

  async onClose(connection: Connection): Promise<void> {
    console.log(`CampaignAgent disconnected: ${connection.id}`);

    // Save all messages to database before closing
    if (this.dbOps && this.sessionId && this.messages.length > 0) {
      try {
        console.log(
          `CampaignAgent: Saving ${this.messages.length} messages to database on close`
        );
        for (const message of this.messages) {
          await this.dbOps.saveMessage({
            agentType: "campaign-agent",
            sessionId: this.sessionId,
            role: message.role as "user" | "assistant" | "system",
            content:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
            metadata: {
              timestamp: new Date().toISOString(),
              agentName: "CampaignAgent",
              savedOnClose: true,
            },
          });
        }
        console.log(`CampaignAgent: Successfully saved all messages on close`);
      } catch (error) {
        console.error(
          "CampaignAgent: Failed to save messages on close:",
          error
        );
      }
    }

    if (this.dbManager) {
      try {
        await this.dbManager.close();
      } catch (error) {
        console.warn("Error closing database connection:", error);
      }
    }
  }

  async onChatMessage(
    onFinish: any,
    options?: { abortSignal?: AbortSignal }
  ): Promise<Response> {
    // Save user message before processing - only if message count > 10
    const userMessage = this.messages[this.messages.length - 1];
    if (
      this.dbOps &&
      this.sessionId &&
      userMessage?.role === "user" &&
      this.messages.length > 10
    ) {
      try {
        const savedMessage = await this.dbOps.saveMessage({
          agentType: "campaign-agent",
          sessionId: this.sessionId,
          role: "user",
          content: userMessage.content as string,
          metadata: {
            timestamp: new Date().toISOString(),
            agentName: "CampaignAgent",
          },
        });
        console.log(`CampaignAgent user message saved: ${savedMessage?.id}`);
      } catch (error) {
        console.error("Failed to save user message:", error);
      }
    }

    // Create a streaming response
    return createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          // Initialize OpenAI client
          const openai = createOpenAI({
            apiKey: this.env.OPENAI_API_KEY,
            baseURL: this.env.GATEWAY_BASE_URL,
          });

          // Get tools for this agent based on connected integrations
          const tools = await getToolsForAgent(
            "campaign-agent",
            this.sessionId,
            this.dbOps
          );

          // Debug: Log available tools
          console.log("CampaignAgent available tools:", Object.keys(tools));

          // Stream the AI response
          const result = streamText({
            model: openai("gpt-4o"),
            system: this.systemPrompt,
            messages: this.messages,
            tools,
            onFinish: async (result) => {
              // Save assistant response after completion - only if message count > 10
              if (this.dbOps && this.sessionId && this.messages.length > 10) {
                try {
                  const savedResponse = await this.dbOps.saveMessage({
                    agentType: "campaign-agent",
                    sessionId: this.sessionId,
                    role: "assistant",
                    content: result.text,
                    metadata: {
                      timestamp: new Date().toISOString(),
                      agentName: "CampaignAgent",
                      responseLength: result.text.length,
                      finishReason: result.finishReason,
                      usage: result.usage,
                    },
                  });
                  console.log(
                    `CampaignAgent assistant response saved: ${savedResponse?.id}`
                  );

                  // Update session metadata
                  await this.dbOps.updateSessionMetadata(this.sessionId, {
                    lastActivity: new Date().toISOString(),
                    messageCount: await this.getMessageCount(),
                  });
                } catch (error) {
                  console.error("Failed to save assistant response:", error);
                }
              }

              // Call the original onFinish callback
              if (onFinish) {
                onFinish(result);
              }
            },
            maxSteps: 5,
          });

          // Merge the AI response stream with tool execution outputs
          result.mergeIntoDataStream(dataStream);
        } catch (error) {
          console.error("Error in CampaignAgent onChatMessage:", error);
          // Save error message to database - only if message count > 10
          if (this.dbOps && this.sessionId && this.messages.length > 10) {
            try {
              await this.dbOps.saveMessage({
                agentType: "campaign-agent",
                sessionId: this.sessionId,
                role: "system",
                content: `Error processing message: ${error instanceof Error ? error.message : "Unknown error"}`,
                metadata: {
                  error: true,
                  timestamp: new Date().toISOString(),
                },
              });
            } catch (dbError) {
              console.error("Failed to save error message:", dbError);
            }
          }
          throw error;
        }
      },
    });
  }

  private async getMessageCount(): Promise<number> {
    if (!this.dbOps || !this.sessionId) return 0;
    try {
      const messages = await this.dbOps.getSessionMessages(this.sessionId);
      return messages.length;
    } catch (error) {
      console.warn("Failed to get message count:", error);
      return 0;
    }
  }

  async logToolStart(toolName: string, input: any): Promise<string | null> {
    if (!this.dbOps || !this.sessionId) return null;
    try {
      const execution = await this.dbOps.logToolExecution({
        sessionId: this.sessionId,
        toolName,
        input,
        status: "pending",
      });
      console.log(`CampaignAgent tool execution started: ${execution?.id}`);
      return execution?.id || null;
    } catch (error) {
      console.error("Failed to log tool start:", error);
      return null;
    }
  }

  async logToolComplete(
    executionId: string,
    output: any,
    status: "success" | "error"
  ): Promise<void> {
    if (!this.dbOps || !executionId) return;
    try {
      await this.dbOps.updateToolExecution(executionId, output, status);
      console.log(
        `CampaignAgent tool execution completed: ${executionId} with status: ${status}`
      );
    } catch (error) {
      console.error("Failed to log tool completion:", error);
    }
  }

  async connectIntegration(integrationName: string): Promise<boolean> {
    if (!this.dbOps || !this.sessionId) return false;
    try {
      await this.dbOps.connectIntegration(this.sessionId, integrationName, {
        connectedAt: new Date().toISOString(),
        source: "agent",
        agentType: "campaign-agent",
      });
      console.log(`CampaignAgent connected integration: ${integrationName}`);
      return true;
    } catch (error) {
      console.error(`Failed to connect integration ${integrationName}:`, error);
      return false;
    }
  }

  async disconnectIntegration(integrationName: string): Promise<boolean> {
    if (!this.dbOps || !this.sessionId) return false;
    try {
      await this.dbOps.disconnectIntegration(this.sessionId, integrationName);
      console.log(`CampaignAgent disconnected integration: ${integrationName}`);
      return true;
    } catch (error) {
      console.error(
        `Failed to disconnect integration ${integrationName}:`,
        error
      );
      return false;
    }
  }
}

export interface Env {
  OPENAI_API_KEY: string;
  GATEWAY_BASE_URL: string;
  HYPERDRIVE: Hyperdrive;
  RouterAgent: DurableObjectNamespace;
  CampaignAgent: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Handle OpenAI key check
    if (url.pathname === "/check-open-ai-key") {
      const hasOpenAIKey = !!env.OPENAI_API_KEY;
      return new Response(JSON.stringify({ success: hasOpenAIKey }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Handle integrations API
    if (url.pathname.startsWith("/api/integrations")) {
      try {
        // Get session_id from query params or headers
        const sessionId =
          url.searchParams.get("sessionId") ||
          request.headers.get("x-session-id");

        if (url.pathname === "/api/integrations" && request.method === "GET") {
          // Get all available integrations with status
          let integrationList: any = Object.entries(integrations).map(
            ([key, integration]) => ({
              id: key, // Use key as id for filtering
              name: integration.name, // Display name
              ...getIntegrationStatus(key as any),
            })
          );

          // If sessionId provided, get actual connection status from database
          if (sessionId) {
            try {
              const dbManager = new DatabaseManager(
                env.HYPERDRIVE.connectionString
              );
              const { db } = dbManager.getDb();
              const dbOps = new DbOperations(db);

              const sessionIntegrations =
                await dbOps.getSessionIntegrations(sessionId);
              const connectedIntegrations = new Set(
                sessionIntegrations
                  .filter((conn) => conn.status === "connected")
                  .map((conn) => conn.integrationName)
              );

              // Update integration list with actual connection status
              integrationList = integrationList.map((integration) => ({
                ...integration,
                connected: connectedIntegrations.has(integration.id),
                lastSync: sessionIntegrations.find(
                  (conn) => conn.integrationName === integration.id
                )?.lastSyncAt,
              }));

              await dbManager.close();
            } catch (error) {
              console.error("Failed to get session integrations:", error);
              // Continue with default status if DB fails
            }
          }

          return new Response(
            JSON.stringify({ integrations: integrationList }),
            {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        if (
          url.pathname.startsWith("/api/integrations/") &&
          request.method === "POST"
        ) {
          // Connect an integration
          const integrationName = url.pathname.split("/").pop();
          if (
            !integrationName ||
            !integrations[integrationName as keyof typeof integrations]
          ) {
            return new Response(
              JSON.stringify({ error: "Integration not found" }),
              {
                status: 404,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }

          if (!sessionId) {
            return new Response(
              JSON.stringify({ error: "Session ID required" }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }

          // Connect integration in database
          try {
            const dbManager = new DatabaseManager(
              env.HYPERDRIVE.connectionString
            );
            const { db } = dbManager.getDb();
            const dbOps = new DbOperations(db);

            await dbOps.connectIntegration(sessionId, integrationName, {
              connectedAt: new Date().toISOString(),
              source: "api",
            });

            await dbManager.close();

            return new Response(
              JSON.stringify({
                success: true,
                integration: integrationName,
                status: "connected",
                message: `Successfully connected to ${integrationName}`,
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          } catch (error) {
            console.error("Failed to connect integration:", error);
            return new Response(
              JSON.stringify({
                error: "Failed to connect integration",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              }),
              {
                status: 500,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }
        }

        if (
          url.pathname.startsWith("/api/integrations/") &&
          request.method === "DELETE"
        ) {
          // Disconnect an integration
          const integrationName = url.pathname.split("/").pop();
          if (
            !integrationName ||
            !integrations[integrationName as keyof typeof integrations]
          ) {
            return new Response(
              JSON.stringify({ error: "Integration not found" }),
              {
                status: 404,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }

          if (!sessionId) {
            return new Response(
              JSON.stringify({ error: "Session ID required" }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }

          // Disconnect integration in database
          try {
            const dbManager = new DatabaseManager(
              env.HYPERDRIVE.connectionString
            );
            const { db } = dbManager.getDb();
            const dbOps = new DbOperations(db);

            await dbOps.disconnectIntegration(sessionId, integrationName);

            await dbManager.close();

            return new Response(
              JSON.stringify({
                success: true,
                integration: integrationName,
                status: "disconnected",
                message: `Successfully disconnected from ${integrationName}`,
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          } catch (error) {
            console.error("Failed to disconnect integration:", error);
            return new Response(
              JSON.stringify({
                error: "Failed to disconnect integration",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              }),
              {
                status: 500,
                headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                },
              }
            );
          }
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    // Route to specific agents, RouterAgent will be the default when no specific agent is requested
    return (
      (await routeAgentRequest(
        request,
        {
          RouterAgent: env.RouterAgent,
          CampaignAgent: env.CampaignAgent,
        },
        { cors: true }
      )) || new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
