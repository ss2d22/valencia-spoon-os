"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VerdictSummary } from "@/components/VerdictSummary";
// Using mock API for UI testing - switch back to "@/lib/api" when ready for backend integration
import {
  getVerdict,
  getDebateTranscript,
  getAgentAnalyses,
  getAudioUrl,
  getAudioStreamUrl,
} from "@/lib/mockApi";
import type { Verdict, DebateRound, AgentAnalysis } from "@/lib/api";
import { Gavel, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VerdictPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [debateRounds, setDebateRounds] = useState<DebateRound[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [agents, setAgents] = useState<Record<string, AgentAnalysis>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerdict() {
      if (!sessionId) return;

      try {
        setLoading(true);
        const [verdictData, debateData, agentData] = await Promise.all([
          getVerdict(sessionId),
          getDebateTranscript(sessionId).catch(() => ({ debate_rounds: [], total_rounds: 0 })),
          getAgentAnalyses(sessionId).catch(() => ({ agents: {} })),
        ]);

        setVerdict(verdictData);
        setDebateRounds(debateData.debate_rounds);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load verdict");
      } finally {
        setLoading(false);
      }
    }

    loadVerdict();
  }, [sessionId]);

  if (loading) {
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
              <Link href="/" className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          )}

          {verdict && (
            <VerdictSummary
              verdict={verdict}
              debateRounds={debateRounds}
              audioUrl={audioUrl}
              agents={agents}
              sessionId={sessionId}
            />
          )}
        </div>
      </main>
    </div>
  );
}
