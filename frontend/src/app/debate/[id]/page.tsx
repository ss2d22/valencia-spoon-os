"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DebateView } from "@/components/DebateView";
// Using mock API for UI testing - switch back to "@/lib/api" when ready for backend integration
import {
  getTribunalStatus,
  getAgentAnalyses,
} from "@/lib/mockApi";
import type { AgentAnalysis } from "@/lib/api";
import { ArrowLeft, Loader2, Gavel } from "lucide-react";
import Link from "next/link";

export default function DebatePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [agents, setAgents] = useState<Record<string, AgentAnalysis>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verdictReady, setVerdictReady] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<any[]>([]);

  useEffect(() => {
    async function loadDebate() {
      if (!sessionId) return;

      try {
        setLoading(true);
        const agentData = await getAgentAnalyses(sessionId).catch(() => ({ agents: {} }));

        const agentMap: Record<string, AgentAnalysis> = {};
        for (const [role, analysis] of Object.entries(agentData.agents)) {
          agentMap[role] = analysis as AgentAnalysis;
        }
        setAgents(agentMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load debate");
      } finally {
        setLoading(false);
      }
    }

    loadDebate();
  }, [sessionId]);

  // Poll for verdict readiness
  useEffect(() => {
    if (!sessionId) return;

    const checkVerdictStatus = async () => {
      try {
        const status = await getTribunalStatus(sessionId);
        if (status.status === "completed") {
          setVerdictReady(true);
        }
      } catch {
        // Silent error
      }
    };

    checkVerdictStatus();
    const interval = setInterval(checkVerdictStatus, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleUserMessage = async (message: string) => {
    // In a real implementation, this would send the message to the backend
    // and receive agent responses via WebSocket or polling
    console.log("User message sent to backend:", message);
    // The DebateView component will handle the mock responses for UI testing
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href={`/tribunal?session=${sessionId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <span className="text-xl font-bold">Live Debate</span>
            </div>
            <Button
              onClick={() => {
                // Store live transcript in sessionStorage
                if (liveTranscript.length > 0) {
                  sessionStorage.setItem(`live_transcript_${sessionId}`, JSON.stringify(liveTranscript));
                }
                // Set flag to indicate user wants to see verdict
                sessionStorage.setItem(`show_verdict_${sessionId}`, "true");
                router.push(`/tribunal?session=${sessionId}`);
              }}
              className="bg-primary hover:bg-primary/90"
              variant={verdictReady ? "default" : "outline"}
            >
              {"End"}
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex-1 pt-16">
        <DebateView
          agents={agents}
          sessionId={sessionId}
          onUserMessage={handleUserMessage}
          onTranscriptChange={setLiveTranscript}
        />
      </div>
    </div>
  );
}

