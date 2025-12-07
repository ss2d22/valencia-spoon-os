"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Gavel,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Download,
  Play,
} from "lucide-react";
import type { Verdict, CriticalIssue } from "@/lib/api";

interface VerdictDisplayProps {
  verdict: Verdict;
  onPlayAudio?: () => void;
  onDownload?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Weak";
  return "Serious Issues";
}

function getSeverityIcon(severity: CriticalIssue["severity"]) {
  switch (severity) {
    case "FATAL_FLAW":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "SERIOUS_CONCERN":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "MINOR_ISSUE":
      return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

export function VerdictDisplay({ verdict, onPlayAudio, onDownload }: VerdictDisplayProps) {
  const scoreColor = getScoreColor(verdict.verdict_score);
  const scoreLabel = getScoreLabel(verdict.verdict_score);

  const fatalFlaws = verdict.critical_issues.filter((i) => i.severity === "FATAL_FLAW");
  const seriousConcerns = verdict.critical_issues.filter((i) => i.severity === "SERIOUS_CONCERN");
  const minorIssues = verdict.critical_issues.filter((i) => i.severity === "MINOR_ISSUE");

  return (
    <div className="space-y-6">
      <Card className="glass-card overflow-hidden">
        <div className={cn("h-2", verdict.verdict_score >= 60 ? "bg-success" : "bg-destructive")} />
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Tribunal Verdict
            </CardTitle>
            <Badge variant={verdict.verdict_score >= 60 ? "success" : "destructive"}>
              {scoreLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="text-center">
                <div className={cn("text-6xl font-bold", scoreColor)}>
                  {verdict.verdict_score}
                </div>
                <div className="text-sm text-muted-foreground mt-1">out of 100</div>
              </div>
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

          <div className="flex gap-2">
            {onPlayAudio && (
              <Button onClick={onPlayAudio} variant="outline" className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Play Debate
              </Button>
            )}
            {onDownload && (
              <Button onClick={onDownload} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {verdict.critical_issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Critical Issues ({verdict.critical_issues.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fatalFlaws.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Fatal Flaws ({fatalFlaws.length})
                </h4>
                {fatalFlaws.map((issue, i) => (
                  <div key={i} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(issue.severity)}
                      <div>
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
                <h4 className="text-sm font-medium text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Serious Concerns ({seriousConcerns.length})
                </h4>
                {seriousConcerns.map((issue, i) => (
                  <div key={i} className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(issue.severity)}
                      <div>
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
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Minor Issues ({minorIssues.length})
                </h4>
                {minorIssues.map((issue, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(issue.severity)}
                      <div>
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
          </CardContent>
        </Card>
      )}

      {(verdict.neo_tx_hash || verdict.aioz_verdict_key) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Blockchain Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
