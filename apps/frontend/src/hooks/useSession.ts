import { useState, useEffect } from "react";
import {
  getSessionId,
  getAgentSessionId,
  getSessionInfo,
} from "@/lib/sessionManager";

/**
 * Hook for managing user session across the application
 */
export function useSession() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    created: string;
    isNew: boolean;
  } | null>(null);

  useEffect(() => {
    // Get the main session ID
    const mainSessionId = getSessionId();
    const info = getSessionInfo();

    setSessionId(mainSessionId);
    setSessionInfo(info);
  }, []);

  /**
   * Get agent-specific session ID
   */
  const getAgentSession = (
    agentType: "router-agent" | "campaign-agent" | "gateway"
  ) => {
    return getAgentSessionId(agentType);
  };

  /**
   * Check if this is a new session
   */
  const isNewSession = sessionInfo?.isNew || false;

  return {
    sessionId,
    sessionInfo,
    getAgentSession,
    isNewSession,
  };
}
