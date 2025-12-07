"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Gavel,
  ArrowLeft,
  FileText,
  Calendar,
  Database,
  AlertTriangle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { getVerdictBySessionId, type DashboardVerdict } from "@/lib/api";

export default function VerdictPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [verdict, setVerdict] = useState<(DashboardVerdict & { metadata?: Record<string, unknown> }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerdict() {
      if (!sessionId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getVerdictBySessionId(sessionId);
        setVerdict(data);
      } catch (err) {
        console.error("Failed to load verdict:", err);
        setError(err instanceof Error ? err.message : "Failed to load verdict");
      } finally {
        setLoading(false);
      }
    }

    loadVerdict();
  }, [sessionId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  // Parse memory text to extract verdict details
  const parseMemoryText = (text?: string) => {
    if (!text) return {};

    const lines = text.split("\n").filter(Boolean);
    const parsed: Record<string, string> = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length) {
        parsed[key.trim()] = valueParts.join(":").trim();
      }
    }

    return parsed;
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
              <span className="ml-4 text-xl font-bold">Loading...</span>
            </div>
          </div>
        </nav>
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-64 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !verdict) {
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
              <span className="ml-4 text-xl font-bold">Verdict Not Found</span>
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
                    <p className="text-sm">{error || "Verdict not found in Mem0 storage"}</p>
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

  const parsedDetails = parseMemoryText(verdict.memory_text);

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
                <Gavel className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Verdict Details</span>
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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Paper Title & Score */}
          <Card className="glass-card border-slate-800/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">
                    {verdict.paper_title}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(verdict.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Database className="h-4 w-4" />
                      Stored in Mem0
                    </span>
                  </div>
                </div>
                <Badge
                  variant={getScoreBadgeVariant(verdict.verdict_score)}
                  className="text-lg px-3 py-1"
                >
                  {verdict.verdict_score}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Verdict Score</span>
                    <span className={cn("font-bold", getScoreColor(verdict.verdict_score))}>
                      {verdict.verdict_score}%
                    </span>
                  </div>
                  <Progress value={verdict.verdict_score} className="h-3" />
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Critical Issues Found</span>
                  <Badge variant={verdict.critical_issues_count > 3 ? "destructive" : verdict.critical_issues_count > 0 ? "secondary" : "default"}>
                    {verdict.critical_issues_count}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verdict Summary from Memory */}
          {parsedDetails["Verdict"] && (
            <Card className="glass-card border-slate-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Verdict Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {parsedDetails["Verdict"]}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Critical Issues */}
          {parsedDetails["Critical Issues"] && (
            <Card className="glass-card border-slate-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Critical Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsedDetails["Critical Issues"].split(",").map((issue, i) => (
                    <Badge key={i} variant="outline" className="py-1">
                      {issue.trim()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Session Metadata */}
          <Card className="glass-card border-slate-800/50">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Session Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Session ID</p>
                  <p className="font-mono text-xs">{verdict.session_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Memory ID</p>
                  <p className="font-mono text-xs">{verdict.memory_id || "N/A"}</p>
                </div>
                {parsedDetails["Debate Rounds"] && (
                  <div>
                    <p className="text-muted-foreground">Debate Rounds</p>
                    <p>{parsedDetails["Debate Rounds"]}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{formatDate(verdict.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/interactive" className="flex-1">
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Submit Revision
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
