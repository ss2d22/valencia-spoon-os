"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, Plus, Gavel } from "lucide-react";
import Link from "next/link";
import { VerdictSummary } from "@/components/VerdictSummary";
import {
  getVerdictBySessionId,
  type RichVerdictData,
  type Verdict,
  type AgentAnalysis,
} from "@/lib/api";

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: Date | string;
  isUser?: boolean;
}

export default function VerdictPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [verdictData, setVerdictData] = useState<RichVerdictData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerdict() {
      if (!sessionId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getVerdictBySessionId(sessionId);
        setVerdictData(data);
      } catch (err) {
        console.error("Failed to load verdict:", err);
        setError(err instanceof Error ? err.message : "Failed to load verdict");
      } finally {
        setLoading(false);
      }
    }

    loadVerdict();
  }, [sessionId]);

  const transformToVerdict = (data: RichVerdictData): Verdict => {
    return {
      session_id: data.session_id,
      verdict: {
        summary: data.verdict?.summary || "",
        recommendation: data.verdict?.recommendation || "",
      },
      verdict_score: data.verdict_score,
      critical_issues: (data.critical_issues || []).map((issue) => ({
        title: typeof issue === "string" ? issue : issue.title,
        agent: typeof issue === "string" ? "Unknown" : issue.agent,
        severity: (typeof issue === "string" ? "MINOR_ISSUE" : issue.severity) as
          | "FATAL_FLAW"
          | "SERIOUS_CONCERN"
          | "MINOR_ISSUE",
        description: typeof issue === "string" ? issue : issue.description || "",
      })),
      neo_tx_hash: undefined,
      aioz_verdict_key: undefined,
      aioz_audio_key: undefined,
    };
  };

  const transformToTranscript = (data: RichVerdictData): TranscriptEntry[] => {
    const entries: TranscriptEntry[] = [];

    if (data.debate_rounds) {
      data.debate_rounds.forEach((round, roundIndex) => {
        round.statements.forEach((statement, stmtIndex) => {
          entries.push({
            speaker: statement.agent,
            text: statement.text,
            timestamp: new Date(Date.now() - (data.debate_rounds!.length - roundIndex) * 60000 - stmtIndex * 5000),
            isUser: statement.is_user || statement.agent === "You",
          });
        });
      });
    }

    return entries;
  };

  const transformToAgents = (data: RichVerdictData): Record<string, AgentAnalysis> => {
    const agents: Record<string, AgentAnalysis> = {};

    if (data.agent_analyses) {
      Object.entries(data.agent_analyses).forEach(([key, analysis]) => {
        agents[key] = {
          agent: analysis.agent,
          raw_response: analysis.raw_response,
          concerns: analysis.concerns || [],
          severity: analysis.severity,
          confidence: analysis.confidence,
        };
      });
    }

    return agents;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 ml-4">
                <Gavel className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold">Loading...</span>
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-64 w-full mb-4" />
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !verdictData) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 ml-4">
                <Gavel className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold">Verdict Not Found</span>
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Failed to load verdict</p>
                    <p className="text-sm">{error || "Verdict not found"}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Dashboard
                    </Button>
                  </Link>
                  <Link href="/interactive">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Start New Tribunal
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const verdict = transformToVerdict(verdictData);
  const liveTranscript = transformToTranscript(verdictData);
  const agents = transformToAgents(verdictData);

  const hasAgentData = Object.keys(agents).length > 0;
  const displayAgents = hasAgentData
    ? agents
    : {
        skeptic: {
          agent: "The Skeptic",
          raw_response: "",
          concerns: [],
          severity: "UNKNOWN",
          confidence: 0,
        },
        statistician: {
          agent: "The Statistician",
          raw_response: "",
          concerns: [],
          severity: "UNKNOWN",
          confidence: 0,
        },
        methodologist: {
          agent: "The Methodologist",
          raw_response: "",
          concerns: [],
          severity: "UNKNOWN",
          confidence: 0,
        },
        ethicist: {
          agent: "The Ethicist",
          raw_response: "",
          concerns: [],
          severity: "UNKNOWN",
          confidence: 0,
        },
      };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold truncate max-w-[300px]">
                  {verdictData.paper_title}
                </span>
              </div>
            </div>
            <Link href="/interactive">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Revision
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <VerdictSummary
            verdict={verdict}
            liveTranscript={liveTranscript}
            agents={displayAgents}
            sessionId={sessionId}
          />
        </div>
      </main>
    </div>
  );
}
