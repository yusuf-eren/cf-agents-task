import { useState, useEffect } from "react";
import { getSessionInfo, clearSession } from "@/lib/sessionManager";
import { Button } from "../button/Button";
import { Card } from "../card/Card";
import { Copy, Trash } from "@phosphor-icons/react";

interface SessionInfoProps {
  className?: string;
}

export function SessionInfo({ className }: SessionInfoProps) {
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    created: string;
    isNew: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const info = getSessionInfo();
    setSessionInfo(info);
  }, []);

  const handleCopySessionId = async () => {
    if (sessionInfo) {
      await navigator.clipboard.writeText(sessionInfo.sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearSession = () => {
    clearSession();
    // Refresh page to get new session
    window.location.reload();
  };

  if (!sessionInfo) return null;

  return (
    <Card className={`p-3 ${className}`}>
      <div className="space-y-2">
        <div className="text-sm font-medium">Session Info</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Session ID:</span>
            <div className="flex items-center gap-1">
              <code className="text-xs bg-muted px-1 rounded">
                {sessionInfo.sessionId.split("-").pop()?.substring(0, 8)}...
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopySessionId}
                className="h-6 w-6 p-0"
              >
                <Copy size={12} />
              </Button>
            </div>
          </div>
          {copied && <div className="text-xs text-green-600">Copied!</div>}
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearSession}
            className="h-6 text-xs text-muted-foreground hover:text-red-600"
          >
            <Trash size={12} className="mr-1" />
            Reset Session
          </Button>
        </div>
      </div>
    </Card>
  );
}
