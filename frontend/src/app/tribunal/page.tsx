"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingTimeline } from "@/components/LoadingTimeline";
import { VerdictSummary } from "@/components/VerdictSummary";
import {
  getTribunalStatus,
  getVerdict,
  getAgentAnalyses,
  getAudioUrl,
  getAudioStreamUrl,
  type Verdict,
  type AgentAnalysis,
} from "@/lib/api";
import { Gavel, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function TribunalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session");

  const [status, setStatus] = useState<"queued" | "running" | "completed" | "failed">("running");
  const [currentStage, setCurrentStage] = useState<string | undefined>("upload");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<any[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [agents, setAgents] = useState<Record<string, AgentAnalysis>>({});
  const [error, setError] = useState<string | null>(null);

  const [hasNavigatedToDebate, setHasNavigatedToDebate] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);

  const pollStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const statusData = await getTribunalStatus(sessionId);
      setStatus(statusData.status);
      setCurrentStage(statusData.current_stage);

      const shouldShowVerdict = sessionStorage.getItem(`show_verdict_${sessionId}`) === "true";
      if (shouldShowVerdict) {
        setShowVerdict(true);
      }

      if (statusData.current_stage === "ethicist_complete" && !hasNavigatedToDebate && !shouldShowVerdict) {
        setHasNavigatedToDebate(true);
        router.push(`/debate/${sessionId}`);
        return;
      }

      if (shouldShowVerdict) {
        try {
          const [verdictData, agentData] = await Promise.all([
            getVerdict(sessionId).catch(() => null),
            getAgentAnalyses(sessionId).catch(() => ({ agents: {} })),
          ]);

          if (verdictData) {
            setVerdict(verdictData);

            const agentMap: Record<string, AgentAnalysis> = {};
            for (const [role, analysis] of Object.entries(agentData.agents)) {
              agentMap[role] = analysis as AgentAnalysis;
            }
            setAgents(agentMap);

            try {
              const audio = await getAudioUrl(sessionId);
              setAudioUrl(audio.audio_url);
            } catch {
              setAudioUrl(getAudioStreamUrl(sessionId));
            }
          }
        } catch {
        }
      } else if (statusData.status === "completed" && showVerdict) {
        const [verdictData, agentData] = await Promise.all([
          getVerdict(sessionId),
          getAgentAnalyses(sessionId).catch(() => ({ agents: {} })),
        ]);

        setVerdict(verdictData);

        const agentMap: Record<string, AgentAnalysis> = {};
        for (const [role, analysis] of Object.entries(agentData.agents)) {
          agentMap[role] = analysis as AgentAnalysis;
        }
        setAgents(agentMap);

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
  }, [sessionId, hasNavigatedToDebate, showVerdict, router]);

  useEffect(() => {
    if (!sessionId) {
      router.push("/");
      return;
    }

    const shouldShowVerdict = sessionStorage.getItem(`show_verdict_${sessionId}`) === "true";
    if (shouldShowVerdict) {
      setShowVerdict(true);
      try {
        const storedTranscript = sessionStorage.getItem(`live_transcript_${sessionId}`);
        if (storedTranscript) {
          const parsed = JSON.parse(storedTranscript);
          const processed = parsed.map((entry: any) => ({
            ...entry,
            timestamp: typeof entry.timestamp === "string" ? new Date(entry.timestamp) : entry.timestamp,
          }));
          setLiveTranscript(processed);
        }
      } catch (error) {
        console.error("Error loading transcript in initial useEffect:", error);
      }
    }

    pollStatus();

    const interval = setInterval(() => {
      if (status === "queued" || status === "running") {
        pollStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, status, pollStatus, router]);

  useEffect(() => {
    if (showVerdict && sessionId) {
      try {
        const storedTranscript = sessionStorage.getItem(`live_transcript_${sessionId}`);
        if (storedTranscript) {
          const parsed = JSON.parse(storedTranscript);
          const processed = parsed.map((entry: any) => ({
            ...entry,
            timestamp: typeof entry.timestamp === "string" ? new Date(entry.timestamp) : entry.timestamp,
          }));
          setLiveTranscript(processed);
        }
      } catch (error) {
        console.error("Error loading transcript:", error);
      }
    }
  }, [showVerdict, sessionId]);

  useEffect(() => {
    const shouldShowVerdict = sessionStorage.getItem(`show_verdict_${sessionId}`) === "true";
    if (currentStage === "ethicist_complete" && !hasNavigatedToDebate && sessionId && !shouldShowVerdict) {
      setHasNavigatedToDebate(true);
      router.push(`/debate/${sessionId}`);
    }
  }, [currentStage, hasNavigatedToDebate, sessionId, router]);

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

          {!showVerdict ? (
            <LoadingTimeline
              currentStage={currentStage}
              status={status}
            />
          ) : verdict ? (
            <VerdictSummary
              verdict={verdict}
              liveTranscript={liveTranscript}
              audioUrl={audioUrl}
              agents={agents}
              sessionId={sessionId}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Loading verdict...</p>
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
