"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Gavel,
  FileText,
  Users,
  User,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  Scale,
  Shield,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Save,
} from "lucide-react";
import type { Verdict, DebateRound, AgentAnalysis } from "@/lib/api";
import Link from "next/link";

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: Date | string;
  isUser?: boolean;
}

interface VerdictSummaryProps {
  verdict: Verdict;
  debateRounds?: DebateRound[]; // Optional for backward compatibility
  liveTranscript?: TranscriptEntry[]; // Live user-agent conversation
  audioUrl?: string;
  agents: Record<string, AgentAnalysis>;
  sessionId: string;
}

const agentConfig: Record<string, {
  name: string;
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
  description: string;
}> = {
  "The Skeptic": {
    name: "The Skeptic",
    icon: AlertTriangle,
    color: "text-white",
    bgColor: "bg-black",
    description: "Questions everything, finds alternative explanations",
  },
  "The Statistician": {
    name: "The Statistician",
    icon: BarChart3,
    color: "text-white",
    bgColor: "bg-black",
    description: "Audits numbers, catches p-hacking",
  },
  "The Methodologist": {
    name: "The Methodologist",
    icon: Scale,
    color: "text-white",
    bgColor: "bg-black",
    description: "Evaluates experimental design",
  },
  "The Ethicist": {
    name: "The Ethicist",
    icon: Shield,
    color: "text-white",
    bgColor: "bg-black",
    description: "Identifies bias and conflicts",
  },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "FATAL_FLAW":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "SERIOUS_CONCERN":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "MINOR_ISSUE":
      return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    default:
      return null;
  }
}

export function VerdictSummary({
  verdict,
  debateRounds,
  liveTranscript = [],
  audioUrl,
  agents,
  sessionId,
}: VerdictSummaryProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("verdict");

  const fatalFlaws = verdict.critical_issues.filter((i) => i.severity === "FATAL_FLAW");
  const seriousConcerns = verdict.critical_issues.filter((i) => i.severity === "SERIOUS_CONCERN");
  const minorIssues = verdict.critical_issues.filter((i) => i.severity === "MINOR_ISSUE");

  // Calculate user participation from live transcript
  const userMessages = liveTranscript.filter((entry) => entry.isUser);
  const addressedCritiques = Math.floor(userMessages.length * 0.3);
  const interactionScore = Math.min(100, Math.floor((addressedCritiques / Math.max(1, fatalFlaws.length)) * 100) || 0);

  // Format timestamp for display
  const formatTime = (timestamp: Date | string) => {
    try {
      if (typeof timestamp === "string") {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          return "Invalid date";
        }
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return "Invalid date";
    } catch {
      return "Invalid date";
    }
  };

  const handleSave = () => {
    // Navigate to dashboard page
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tribunal Verdict</h1>
        <Button
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="verdict">Verdict</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="participation">Participation</TabsTrigger>
        </TabsList>

        <TabsContent value="verdict" className="space-y-6">
          <Card className="glass-card border-slate-800/50">
            <div className={cn("h-2", verdict.verdict_score >= 60 ? "bg-green-500" : "bg-red-500")} />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Tribunal Verdict
                </CardTitle>
                <Badge variant={verdict.verdict_score >= 60 ? "success" : "destructive"}>
                  {verdict.verdict_score >= 80 ? "Strong" : verdict.verdict_score >= 60 ? "Moderate" : "Weak"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className={cn("text-6xl font-bold", getScoreColor(verdict.verdict_score))}>
                    {verdict.verdict_score}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">out of 100</div>
                </div>
              </div>

              <div className="space-y-2">
                <Progress value={verdict.verdict_score} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Poor</span>
                  <span>Acceptable</span>
                  <span>Good</span>
                  <span>Excellent</span>
                </div>
              </div>

              {verdict.verdict.summary && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-medium">Summary</h4>
                  <p className="text-sm text-muted-foreground">{verdict.verdict.summary}</p>
                </div>
              )}

              {verdict.verdict.recommendation && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                  <h4 className="font-medium text-primary">Recommendation</h4>
                  <p className="text-sm">{verdict.verdict.recommendation}</p>
                </div>
              )}

              {verdict.critical_issues.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Critical Issues ({verdict.critical_issues.length})</h4>
                  
                  {fatalFlaws.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-destructive flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Fatal Flaws ({fatalFlaws.length})
                      </h5>
                      {fatalFlaws.map((issue, i) => (
                        <div key={i} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{issue.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                              <Badge variant="outline" className="mt-2 text-xs">
                                {issue.agent}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {seriousConcerns.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-warning flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Serious Concerns ({seriousConcerns.length})
                      </h5>
                      {seriousConcerns.map((issue, i) => (
                        <div key={i} className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{issue.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                              <Badge variant="outline" className="mt-2 text-xs">
                                {issue.agent}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {minorIssues.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Minor Issues ({minorIssues.length})
                      </h5>
                      {minorIssues.map((issue, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1">
                              <p className="font-medium text-sm">{issue.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                              <Badge variant="outline" className="mt-2 text-xs">
                                {issue.agent}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(verdict.neo_tx_hash || verdict.aioz_verdict_key) && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Blockchain Verification</h4>
                  <div className="space-y-2">
                    {verdict.neo_tx_hash && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">Neo Transaction</p>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                            {verdict.neo_tx_hash}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`https://neoscan.io/transaction/${verdict.neo_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                    {verdict.aioz_verdict_key && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">AIOZ Storage</p>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                            {verdict.aioz_verdict_key}
                          </p>
                        </div>
                        <Badge variant="success">Stored</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transcript" className="space-y-6">
          <Card className="glass-card border-slate-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Live Debate Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {liveTranscript.length > 0 ? (
                  liveTranscript.map((entry, index) => {
                    const config = entry.isUser
                      ? null
                      : agentConfig[entry.speaker] || null;
                    const Icon = config?.icon || User;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex gap-3 p-3 rounded-lg transition-all",
                          entry.isUser && "bg-muted/50"
                        )}
                      >
                        {!entry.isUser && config && (
                          <div className={cn("w-8 h-8 rounded-lg shrink-0 flex items-center justify-center", config.bgColor)}>
                            <Icon className={cn("h-5 w-5", config.color)} />
                          </div>
                        )}
                        {entry.isUser && (
                          <div className="w-8 h-8 rounded-lg shrink-0 bg-primary flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{entry.speaker}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.text}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No transcript available.</p>
                    <p className="text-xs mt-2">The debate transcript will appear here after you interact with the agents.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(agents).map(([role, analysis]) => {
              const config = agentConfig[analysis.agent] || {
                name: analysis.agent,
                icon: Users,
                color: "text-gray-500",
                bgColor: "bg-gray-500/10",
                description: "",
              };
              const Icon = config.icon;

              return (
                <Card key={role} className="glass-card border-slate-800/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", config.bgColor)}>
                        <Icon className={cn("h-5 w-5", config.color)} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{config.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                      <Badge variant="outline">{analysis.severity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Confidence</span>
                        <span>{analysis.confidence}%</span>
                      </div>
                      <Progress value={analysis.confidence} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium">Total Critiques Flagged</p>
                      <p className="text-2xl font-bold">{analysis.concerns.length}</p>
                    </div>

                    {analysis.concerns.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Key Concerns</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {analysis.concerns.slice(0, 5).map((concern, i) => (
                            <div
                              key={i}
                              className="text-xs p-2 rounded bg-muted/50 flex items-center gap-2"
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  concern.severity === "FATAL_FLAW" && "bg-destructive",
                                  concern.severity === "SERIOUS_CONCERN" && "bg-warning",
                                  concern.severity === "MINOR_ISSUE" && "bg-muted-foreground"
                                )}
                              />
                              <span className="truncate">{concern.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="participation" className="space-y-6">
          <Card className="glass-card border-slate-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                User Participation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Interaction Score</span>
                  <span className="text-2xl font-bold">{interactionScore}</span>
                </div>
                <Progress value={interactionScore} className="h-3" />
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Your Messages</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {userMessages.length > 0 ? (
                    userMessages.map((msg, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No user messages recorded</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Critiques Addressed</h4>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {addressedCritiques} out of {fatalFlaws.length} fatal flaws addressed
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

