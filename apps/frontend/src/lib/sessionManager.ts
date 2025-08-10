/**
 * Session Management Utility
 * Handles persistent user session ID across the entire application
 */

const SESSION_KEY = "user-session-id";
const SESSION_PREFIX = "user-session";

/**
 * Generates a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${SESSION_PREFIX}-${timestamp}-${randomPart}`;
}

/**
 * Gets or creates a persistent session ID
 * This session ID will be used across all agents and integrations
 */
export function getSessionId(): string {
  // Try to get existing session ID from localStorage
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    // Generate new session ID if none exists
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
    console.log("Created new session ID:", sessionId);
  } else {
    console.log("Using existing session ID:", sessionId);
  }

  return sessionId;
}

/**
 * Clears the current session (useful for logout/reset)
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  console.log("Session cleared");
}

/**
 * Gets session info for debugging
 */
export function getSessionInfo() {
  const sessionId = getSessionId();
  const created = localStorage.getItem(`${SESSION_KEY}-created`) || "unknown";

  return {
    sessionId,
    created,
    isNew: !localStorage.getItem(SESSION_KEY),
  };
}

/**
 * Creates agent-specific session IDs that are consistent across all connections
 * This ensures integrations and conversation history use the same session ID
 */
export function getAgentSessionId(
  agentType: "router-agent" | "campaign-agent" | "gateway"
): string {
  // Use fixed session IDs that match backend expectations
  // This ensures integrations connected for an agent work across all sessions
  return `${agentType}-persistent`;
}
