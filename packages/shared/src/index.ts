// Approval string to be shared across frontend and backend
export const APPROVAL = {
  YES: "Yes, confirmed.",
  NO: "No, denied.",
} as const;

// Agent types
export type AgentType = "auto-agent" | "campaign-agent";

// Agent display names
export const getAgentDisplayName = (type: AgentType): string => {
  switch (type) {
    case "auto-agent":
      return "Auto Agent";
    case "campaign-agent":
      return "Campaign Agent";
    default:
      return "Auto Agent";
  }
};

// Agent options for UI
export const agentOptions = [
  { value: "Auto Agent" },
  { value: "Campaign Agent" },
];

// Connection status types
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

// Common utility functions
export const normalizeAgentType = (displayName: string): AgentType => {
  return displayName === "Auto Agent" ? "auto-agent" : "campaign-agent";
};