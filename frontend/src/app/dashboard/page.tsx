"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  ArrowLeft,
  Calendar,
  Plus,
  RefreshCw,
  Database,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import {
  getVerdictsGroupedByPaper,
  getVerdictStats,
  type PaperVersionGroup,
  type VerdictStats,
} from "@/lib/api";

export default function DashboardPage() {
  const [papers, setPapers] = useState<PaperVersionGroup[]>([]);
  const [stats, setStats] = useState<VerdictStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [papersData, statsData] = await Promise.all([
        getVerdictsGroupedByPaper(50),
        getVerdictStats(),
      ]);

      setPapers(papersData.papers);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

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
                <Database className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold">Verdict Dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Link href="/interactive">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Tribunal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {error && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Failed to load data</p>
                    <p className="text-sm">{error}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Make sure the backend is running and Mem0 is configured.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="glass-card border-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tribunals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <div className="text-3xl font-bold">
                    {stats?.total_verdicts ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <div className={cn("text-3xl font-bold", getScoreColor(stats?.average_score ?? 0))}>
                    {Math.round(stats?.average_score ?? 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Highest Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <div className="text-3xl font-bold text-green-500">
                    {stats?.highest_score ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Lowest Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <div className="text-3xl font-bold text-red-500">
                    {stats?.lowest_score ?? 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Paper Version Timeline */}
          <Card className="glass-card border-slate-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Papers &amp; Version History
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track paper revisions and improvements across tribunal sessions
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : papers.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No verdicts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a tribunal to see verdicts here. They will be stored in Mem0.
                  </p>
                  <Link href="/interactive">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Start First Tribunal
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {papers.map((paper) => (
                    <Card
                      key={paper.paper_title}
                      className="border-slate-700/50 hover:border-primary/50 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-1">
                              {paper.paper_title}
                            </CardTitle>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {paper.version_count} version{paper.version_count > 1 ? "s" : ""}
                              </span>
                              <span className="flex items-center gap-1">
                                Best: <span className={getScoreColor(paper.best_score)}>{paper.best_score}</span>
                              </span>
                            </div>
                          </div>
                          <Badge variant={getScoreBadgeVariant(paper.latest_score)}>
                            Latest: {paper.latest_score}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {paper.versions.map((version) => (
                            <Link
                              key={version.memory_id || `${version.session_id}-v${version.version}`}
                              href={`/verdicts/${version.session_id}`}
                              className="block"
                            >
                              <Card
                                className={cn(
                                  "min-w-[200px] transition-all hover:shadow-lg hover:border-primary/50",
                                  "glass-card border-slate-800/50"
                                )}
                              >
                                <CardContent className="pt-4 pb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="font-mono">
                                      v{version.version}
                                    </Badge>
                                    <span
                                      className={cn(
                                        "text-xl font-bold",
                                        getScoreColor(version.verdict_score)
                                      )}
                                    >
                                      {version.verdict_score}
                                    </span>
                                  </div>
                                  <Progress
                                    value={version.verdict_score}
                                    className="h-1.5 mb-2"
                                  />
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(version.created_at)}
                                    </span>
                                    <span>
                                      {version.critical_issues_count} issues
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                          {/* Add revision button */}
                          <Link href="/interactive" className="block">
                            <Card
                              className={cn(
                                "min-w-[200px] h-full flex items-center justify-center",
                                "border-dashed border-2 border-muted-foreground/25",
                                "hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                              )}
                            >
                              <CardContent className="flex flex-col items-center justify-center py-6">
                                <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground">
                                  Add Revision
                                </span>
                              </CardContent>
                            </Card>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Improvement Trend */}
          {papers.some((p) => p.version_count > 1) && (
            <Card className="glass-card border-slate-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Improvement Trends
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Papers with multiple revisions showing score changes
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {papers
                    .filter((p) => p.version_count > 1)
                    .map((paper) => {
                      const firstScore = paper.versions[0]?.verdict_score ?? 0;
                      const lastScore = paper.versions[paper.versions.length - 1]?.verdict_score ?? 0;
                      const improvement = lastScore - firstScore;

                      return (
                        <div
                          key={paper.paper_title}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{paper.paper_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {paper.version_count} versions
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-muted-foreground">{firstScore}</span>
                              <span className="mx-2">→</span>
                              <span className={getScoreColor(lastScore)}>{lastScore}</span>
                            </div>
                            <Badge
                              variant={improvement >= 0 ? "default" : "destructive"}
                              className="min-w-[60px] justify-center"
                            >
                              {improvement >= 0 ? "+" : ""}
                              {improvement}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
