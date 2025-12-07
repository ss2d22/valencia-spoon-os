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
  FileText,
  Users,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import Link from "next/link";
// Using mock API for UI testing - switch back to "@/lib/api" when ready for backend integration
import { searchVerdicts } from "@/lib/mockApi";
import type { Verdict } from "@/lib/api";

interface PaperVersion {
  sessionId: string;
  title: string;
  verdictScore: number;
  timestamp: Date;
  criticalIssues: number;
}

export default function DashboardPage() {
  const [versions, setVersions] = useState<PaperVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentDynamics, setAgentDynamics] = useState<Record<string, number>>({});

  useEffect(() => {
    // Mock data for now - in production, this would fetch from backend
    const mockVersions: PaperVersion[] = [
      {
        sessionId: "session-1",
        title: "Neural Network Optimization",
        verdictScore: 75,
        timestamp: new Date("2024-01-15"),
        criticalIssues: 3,
      },
      {
        sessionId: "session-2",
        title: "Quantum Computing Applications",
        verdictScore: 82,
        timestamp: new Date("2024-01-20"),
        criticalIssues: 1,
      },
      {
        sessionId: "session-3",
        title: "Climate Change Modeling",
        verdictScore: 68,
        timestamp: new Date("2024-01-25"),
        criticalIssues: 5,
      },
    ];

    setTimeout(() => {
      setVersions(mockVersions);
      setAgentDynamics({
        "The Skeptic": 12,
        "The Statistician": 8,
        "The Methodologist": 10,
        "The Ethicist": 6,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const totalCritiques = Object.values(agentDynamics).reduce((a, b) => a + b, 0);

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
                <span className="text-xl font-bold">Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Agent Dynamics Overview */}
          <Card className="glass-card border-slate-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agent Dynamics Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(agentDynamics).map(([agent, count]) => (
                    <div key={agent} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{agent}</span>
                        <span className="font-medium">{count} critiques</span>
                      </div>
                      <Progress
                        value={(count / totalCritiques) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Total Critiques</span>
                      <span>{totalCritiques}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paper Version Timeline */}
          <Card className="glass-card border-slate-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Paper Version Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex gap-4 min-w-max pb-4">
                    {versions.map((version, index) => (
                      <Card
                        key={version.sessionId}
                        className={cn(
                          "min-w-[280px] transition-all hover:shadow-lg",
                          "glass-card border-slate-800/50"
                        )}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base mb-2">
                                {version.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {version.timestamp.toLocaleDateString()}
                              </div>
                            </div>
                            <Badge variant="outline">v{index + 1}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Verdict Score
                              </span>
                              <span
                                className={cn(
                                  "text-2xl font-bold",
                                  getScoreColor(version.verdictScore)
                                )}
                              >
                                {version.verdictScore}
                              </span>
                            </div>
                            <Progress value={version.verdictScore} className="h-2" />
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              Critical Issues
                            </span>
                            <Badge
                              variant={
                                version.criticalIssues > 3
                                  ? "destructive"
                                  : version.criticalIssues > 0
                                  ? "warning"
                                  : "success"
                              }
                            >
                              {version.criticalIssues}
                            </Badge>
                          </div>

                          <Link href={`/verdicts/${version.sessionId}`}>
                            <Button variant="outline" className="w-full" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="glass-card border-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Papers Reviewed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{versions.length}</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {versions.length > 0
                    ? Math.round(
                        versions.reduce((a, b) => a + b.verdictScore, 0) /
                          versions.length
                      )
                    : 0}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Critiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalCritiques}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

