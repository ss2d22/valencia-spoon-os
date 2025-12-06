"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TribunalPanel } from "@/components/TribunalPanel";
import { VerdictDisplay } from "@/components/VerdictDisplay";
import { DebatePlayer } from "@/components/DebatePlayer";
import {
  getTribunalStatus,
  getVerdict,
  getDebateTranscript,
  getAgentAnalyses,
  getAudioUrl,
  getAudioStreamUrl,
} from "@/lib/api";
import type { Verdict, DebateRound, AgentAnalysis } from "@/lib/api";
import type { AgentRole, AgentStatus } from "@/components/AgentCard";
import { Gavel, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function TribunalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  const [status, setStatus] = useState<"queued" | "running" | "completed" | "failed">("queued");
  const [currentStage, setCurrentStage] = useState<string>();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [debateRounds, setDebateRounds] = useState<DebateRound[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [agents, setAgents] = useState<Record<string, {
    status: AgentStatus;
    analysis?: AgentAnalysis;
  }>>({});
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const statusData = await getTribunalStatus(sessionId);
      setStatus(statusData.status);
      setCurrentStage(statusData.current_stage || undefined);

      if (statusData.status === "completed") {
        const [verdictData, debateData, agentData] = await Promise.all([
          getVerdict(sessionId),
          getDebateTranscript(sessionId).catch(() => ({ debate_rounds: [], total_rounds: 0 })),
          getAgentAnalyses(sessionId).catch(() => ({ agents: {} })),
        ]);

        setVerdict(verdictData);
        setDebateRounds(debateData.debate_rounds);

        const agentStatuses: Record<string, { status: AgentStatus; analysis?: AgentAnalysis }> = {};
        for (const [role, analysis] of Object.entries(agentData.agents)) {
          agentStatuses[role] = {
            status: "complete",
            analysis: analysis as AgentAnalysis,
          };
        }
        setAgents(agentStatuses);

        try {
          const audio = await getAudioUrl(sessionId);
          setAudioUrl(audio.audio_url);
        } catch {
          setAudioUrl(getAudioStreamUrl(sessionId));
        }
      } else if (statusData.status === "failed") {
        setError(statusData.progress?.error || "Tribunal failed");
      }
    } catch {
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      router.push("/");
      return;
    }

    pollStatus();

    const interval = setInterval(() => {
      if (status === "queued" || status === "running") {
        pollStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, status, pollStatus, router]);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Gavel className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Tribunal Session</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {status !== "completed" ? (
            <TribunalPanel
              sessionId={sessionId}
              status={status}
              currentStage={currentStage}
              agents={agents}
            />
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {verdict && <VerdictDisplay verdict={verdict} />}
              </div>
              <div className="space-y-6">
                <DebatePlayer
                  audioUrl={audioUrl}
                  rounds={debateRounds}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TribunalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TribunalContent />
    </Suspense>
  );
}
