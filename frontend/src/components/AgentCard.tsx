"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  Scale,
  BarChart3,
  Shield,
} from "lucide-react";

export type AgentRole = "skeptic" | "statistician" | "methodologist" | "ethicist";
export type AgentStatus = "idle" | "analyzing" | "speaking" | "complete";

interface AgentCardProps {
  role: AgentRole;
  status: AgentStatus;
  analysis?: {
    severity: string;
    confidence: number;
    concerns: Array<{ title: string; severity: string }>;
  };
  isSpeaking?: boolean;
}

const agentConfig: Record<AgentRole, {
  name: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  description: string;
}> = {
  skeptic: {
    name: "The Skeptic",
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    description: "Questions everything, finds alternative explanations",
  },
  statistician: {
    name: "The Statistician",
    icon: BarChart3,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Audits numbers, catches p-hacking",
  },
  methodologist: {
    name: "The Methodologist",
    icon: Scale,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    description: "Evaluates experimental design",
  },
  ethicist: {
    name: "The Ethicist",
    icon: Shield,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    description: "Identifies bias and conflicts",
  },
};

const severityColors: Record<string, string> = {
  FATAL_FLAW: "destructive",
  SERIOUS_CONCERN: "warning",
  MINOR_ISSUE: "secondary",
  ACCEPTABLE: "success",
  UNKNOWN: "outline",
};

export function AgentCard({ role, status, analysis, isSpeaking }: AgentCardProps) {
  const config = agentConfig[role];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        status === "speaking" && "ring-2 ring-primary shadow-lg shadow-primary/20",
        status === "analyzing" && "animate-pulse"
      )}
    >
      {isSpeaking && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-pulse" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className={cn("h-12 w-12", config.bgColor)}>
            <AvatarFallback className={cn("bg-transparent", config.color)}>
              <Icon className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-base">{config.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
          <Badge
            variant={
              status === "complete"
                ? "success"
                : status === "speaking"
                ? "default"
                : "secondary"
            }
          >
            {status === "idle" && "Waiting"}
            {status === "analyzing" && "Analyzing..."}
            {status === "speaking" && "Speaking"}
            {status === "complete" && "Done"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === "analyzing" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Analyzing paper...</span>
            </div>
            <Progress value={undefined} className="h-1" />
          </div>
        )}

        {analysis && status === "complete" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Verdict:</span>
              <Badge variant={severityColors[analysis.severity] as "default"}>
                {analysis.severity.replace("_", " ")}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Confidence</span>
                <span>{analysis.confidence}%</span>
              </div>
              <Progress value={analysis.confidence} className="h-1" />
            </div>

            {analysis.concerns.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Key Concerns:</span>
                <div className="space-y-1">
                  {analysis.concerns.slice(0, 3).map((concern, i) => (
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
          </>
        )}

        {isSpeaking && (
          <div className="flex items-center justify-center gap-1 py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full speaking-bar"
                style={{
                  height: "16px",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
