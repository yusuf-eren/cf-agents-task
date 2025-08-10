import { useState, useEffect } from "react";
import { Card } from "../card/Card";
import { Button } from "../button/Button";
import { Loader } from "../loader/Loader";
import { Tooltip } from "../tooltip/Tooltip";
import { Plugs, Check, X, Warning } from "@phosphor-icons/react";
import { TooltipProvider } from "@/providers/TooltipProvider";
import { getAgentSessionId } from "@/lib/sessionManager";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  tools: string[];
  status: string;
  authRequired: boolean;
  connected: boolean;
  lastSync: string;
  toolsCount: number;
}

interface IntegrationsPanelProps {
  agentType: "auto-agent" | "campaign-agent" | "gateway";
}

export function IntegrationsPanel({ agentType }: IntegrationsPanelProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  const [connectingIntegration, setConnectingIntegration] = useState<
    string | null
  >(null);

  // Get unified session ID for this agent
  useEffect(() => {
    const agentSessionId = getAgentSessionId(agentType);
    setSessionId(agentSessionId);
    console.log(
      `IntegrationsPanel using session ID: ${agentSessionId} for agent: ${agentType}`
    );
  }, [agentType]);

  useEffect(() => {
    if (sessionId) {
      fetchIntegrations();
    }
  }, [sessionId]);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8787/api/integrations?sessionId=${sessionId}`
      );
      if (!response.ok) throw new Error("Failed to fetch integrations");

      const data = await response.json();
      setIntegrations(data.integrations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load integrations"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integrationId: string) => {
    try {
      setConnectingIntegration(integrationId);
      const response = await fetch(
        `http://localhost:8787/api/integrations/${integrationId}?sessionId=${sessionId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) throw new Error("Failed to connect integration");

      await response.json();

      // Re-fetch integrations to get updated status from database
      await fetchIntegrations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect integration"
      );
    } finally {
      setConnectingIntegration(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      setConnectingIntegration(integrationId);
      const response = await fetch(
        `http://localhost:8787/api/integrations/${integrationId}?sessionId=${sessionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to disconnect integration");

      // Re-fetch integrations to get updated status from database
      await fetchIntegrations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disconnect integration"
      );
    } finally {
      setConnectingIntegration(null);
    }
  };

  // Filter integrations based on agent type
  const getAvailableIntegrations = () => {
    const agentMappings: Record<string, string[]> = {
      "auto-agent": ["shopify", "posthog"],
      "campaign-agent": ["google-ads", "shopify", "posthog"],
      gateway: [],
    };

    const availableForAgent = agentMappings[agentType] || [];
    return integrations.filter((integration) =>
      availableForAgent.includes(integration.id)
    );
  };

  const availableIntegrations = getAvailableIntegrations();

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plugs size={16} />
          <span className="font-medium text-sm">Integrations</span>
        </div>
        <div className="flex justify-center py-4">
          <Loader />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plugs size={16} />
          <span className="font-medium text-sm">Integrations</span>
        </div>
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <Warning size={14} />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Plugs size={16} />
        <span className="font-medium text-sm">Integrations</span>
        <span className="text-xs text-muted-foreground">
          ({availableIntegrations.filter((i) => i.connected).length}/
          {availableIntegrations.length})
        </span>
      </div>

      <div className="space-y-3">
        {availableIntegrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No integrations available for {agentType}.
          </p>
        ) : (
          availableIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{integration.name}</div>
                  <TooltipProvider>
                    <Tooltip
                      content={`Available tools:\n• ${integration.tools
                        .map((tool) => {
                          // Clean up tool names for better readability
                          return (
                            tool
                              .replace("get", "")
                              .replace("Shopify", "")
                              .replace("GoogleAds", "")
                              .replace("PostHog", "")
                              // Add spaces before capital letters for better readability
                              .replace(/([A-Z])/g, " $1")
                              .trim()
                          );
                        })
                        .join("\n• ")}`}
                    >
                      <div className="text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors">
                        {integration.toolsCount} tools available
                      </div>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  {integration.connected ? (
                    <div className="flex items-center gap-1">
                      <Check size={12} className="text-green-500" />
                      <span className="text-xs text-green-500">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <X size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-400">
                        Not connected
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {integration.category}
                </span>

                {integration.connected ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnect(integration.id)}
                    disabled={connectingIntegration === integration.id}
                    className="text-xs h-6 px-2"
                  >
                    {connectingIntegration === integration.id ? (
                      <>
                        <Loader size={12} />
                        <span>Disconnecting...</span>
                      </>
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(integration.id)}
                    disabled={connectingIntegration === integration.id}
                    className="text-xs h-6 px-2"
                  >
                    {connectingIntegration === integration.id ? (
                      <>
                        <Loader size={12} />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}
              </div>

              {integration.connected && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Available tools:</div>
                    <div className="flex flex-wrap gap-1">
                      {integration.tools.map((tool, index) => (
                        <span
                          key={index}
                          className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs"
                        >
                          {tool
                            .replace("get", "")
                            .replace("Shopify", "")
                            .replace("GoogleAds", "")
                            .replace("PostHog", "")
                            .replace(/([A-Z])/g, " $1")
                            .trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
