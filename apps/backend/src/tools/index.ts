// Export all integration tools
export * from "./google-ads";
export * from "./shopify";
export * from "./posthog";

// Integration metadata for frontend display
export const integrations = {
  "google-ads": {
    name: "Google Ads",
    description:
      "Manage and analyze Google Ads campaigns, keywords, and performance metrics",
    category: "Advertising",
    tools: [
      "getGoogleAdsStats",
      "getGoogleAdsPaymentInfo",
      "getGoogleAdsCampaigns",
      "getGoogleAdsKeywords",
      "getGoogleAdsAudienceInsights",
      "getGoogleAdsCompetitorAnalysis",
    ],
    status: "available",
    authRequired: false, // Will be true in production
  },
  shopify: {
    name: "Shopify",
    description:
      "Access store data including inventory, orders, customers, and analytics",
    category: "E-commerce",
    tools: [
      "getShopifyStoreStats",
      "getShopifyInventory",
      "getShopifyOrders",
      "getShopifyCustomers",
      "getShopifyProducts",
      "getShopifyAnalytics",
    ],
    status: "available",
    authRequired: false, // Will be true in production
  },
  posthog: {
    name: "PostHog",
    description:
      "User analytics, event tracking, feature flags, and behavioral insights",
    category: "Analytics",
    tools: [
      "getPostHogEvents",
      "getPostHogFunnelAnalysis",
      "getPostHogCohortAnalysis",
      "getPostHogUserSegments",
      "getPostHogFeatureFlags",
      "getPostHogInsights",
    ],
    status: "available",
    authRequired: false, // Will be true in production
  },
} as const;

export type IntegrationName = keyof typeof integrations;

// Helper function to get all available tools
export const getAllTools = () => {
  const allTools: Record<string, any> = {};

  // Import and combine all tools
  const { googleAdsTools } = require("./google-ads");
  const { shopifyTools } = require("./shopify");
  const { posthogTools } = require("./posthog");

  Object.assign(allTools, googleAdsTools, shopifyTools, posthogTools);

  return allTools;
};

// Agent tool mappings
export const agentToolMappings = {
  "auto-agent": ["shopify", "posthog"],
  "campaign-agent": ["google-ads", "shopify", "posthog"],
} as const;

// Helper function to get tools by integration
export const getToolsByIntegration = (integrationName: IntegrationName) => {
  const integration = integrations[integrationName];
  if (!integration) return {};

  const allTools = getAllTools();
  const integrationTools: Record<string, any> = {};

  // Search for tools by their 'name' property, not by object key
  integration.tools.forEach((toolName) => {
    // Find the tool that has this name
    for (const [, tool] of Object.entries(allTools)) {
      if (tool && typeof tool === "object" && tool.name === toolName) {
        integrationTools[toolName] = tool;
        break;
      }
    }
  });

  console.log(
    `🔧 Found ${Object.keys(integrationTools).length} tools for ${integrationName}:`,
    Object.keys(integrationTools)
  );
  return integrationTools;
};

// Helper function to convert our tool format to AI SDK format
const convertToolsToAISDKFormat = (tools: Record<string, any>) => {
  console.log("---tuls", tools);
  // Tools are already in the correct format after restructuring
  return tools;
};

// Helper function to get tools for a specific agent with session-based filtering
export const getToolsForAgent = async (
  agentType: keyof typeof agentToolMappings,
  sessionId?: string,
  dbOps?: any
) => {
  const integrationNames = agentToolMappings[agentType];
  const agentTools: Record<string, any> = {};

  for (const integrationName of integrationNames) {
    // Check if this integration is actually connected for the session
    let isConnected = false;

    if (sessionId && dbOps) {
      try {
        const sessionIntegrations =
          await dbOps.getSessionIntegrations(sessionId);
        console.log(
          `🔍 Checking integrations for session ${sessionId}:`,
          sessionIntegrations.map(
            (conn: any) => `${conn.integrationName}:${conn.status}`
          )
        );

        isConnected = sessionIntegrations.some(
          (conn: any) =>
            conn.integrationName === integrationName &&
            conn.status === "connected"
        );
      } catch (error) {
        console.warn(
          `Failed to check integration status for ${integrationName}:`,
          error
        );
        // Default to connected for development
        isConnected = true;
      }
    } else {
      // Default to connected if no session/db context
      console.log(
        `⚠️  No sessionId or dbOps provided, defaulting to connected`
      );
      isConnected = true;
    }

    // Remove temporary override once integration connections are working properly
    // isConnected = true;

    if (isConnected) {
      const tools = getToolsByIntegration(integrationName as IntegrationName);
      Object.assign(agentTools, tools);
      console.log(
        `✅ Added ${Object.keys(tools).length} tools from ${integrationName} integration`
      );
    } else {
      console.log(
        `❌ Skipping ${integrationName} - not connected for session ${sessionId}`
      );
    }
  }

  console.log(
    `🔧 Total tools available for ${agentType}:`,
    Object.keys(agentTools)
  );
  return convertToolsToAISDKFormat(agentTools);
};

// Helper function to check if integration is connected
export const isIntegrationConnected = (
  integrationName: IntegrationName,
  sessionId?: string
): boolean => {
  // For now, return true to allow tool execution
  // In production, this would check the database for connection status
  return true;
};

// Helper function to get integration status
export const getIntegrationStatus = (integrationName: IntegrationName) => {
  const integration = integrations[integrationName];
  if (!integration) return null;

  return {
    ...integration,
    connected: isIntegrationConnected(integrationName),
    lastSync: new Date().toISOString(), // Mock data
    toolsCount: integration.tools.length,
  };
};
