"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AgentCard, AgentRole, AgentStatus } from "./AgentCard";
import { cn } from "@/lib/utils";
import { Gavel, Loader2 } from "lucide-react";

interface TribunalPanelProps {
  sessionId: string;
  status: "queued" | "running" | "completed" | "failed";
  currentStage?: string;
  agents?: Record<string, {
    status: AgentStatus;
    analysis?: {
      severity: string;
      confidence: number;
      concerns: Array<{ title: string; severity: string }>;
    };
  }>;
  currentSpeaker?: AgentRole;
  currentRound?: number;
  totalRounds?: number;
}

const stages = [
  { id: "parsing", label: "Parsing Paper" },
  { id: "analyzing", label: "Agent Analysis" },
  { id: "debating", label: "Debate" },
  { id: "verdict", label: "Verdict" },
  { id: "storing", label: "Blockchain" },
];

export function TribunalPanel({
  sessionId,
  status,
  currentStage,
  agents,
  currentSpeaker,
  currentRound = 0,
  totalRounds = 3,
}: TribunalPanelProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stageIndex = stages.findIndex((s) => s.id === currentStage);
    if (stageIndex >= 0) {
      setProgress(((stageIndex + 1) / stages.length) * 100);
    }
  }, [currentStage]);

  const getAgentStatus = (role: AgentRole): AgentStatus => {
    if (!agents || !agents[role]) {
      if (status === "queued") return "idle";
      if (currentStage === "analyzing") return "analyzing";
      return "idle";
    }
    return agents[role].status;
  };

  const agentRoles: AgentRole[] = ["skeptic", "statistician", "methodologist", "ethicist"];

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Tribunal Session
            </CardTitle>
            <Badge
              variant={
                status === "completed"
                  ? "success"
                  : status === "failed"
                  ? "destructive"
                  : "default"
              }
            >
              {status === "queued" && "Queued"}
              {status === "running" && "In Progress"}
              {status === "completed" && "Complete"}
              {status === "failed" && "Failed"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{sessionId}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex gap-2 flex-wrap">
            {stages.map((stage, i) => {
              const stageIndex = stages.findIndex((s) => s.id === currentStage);
              const isActive = stage.id === currentStage;
              const isComplete = i < stageIndex;

              return (
                <Badge
                  key={stage.id}
                  variant={isComplete ? "success" : isActive ? "default" : "outline"}
                  className={cn(
                    "transition-all",
                    isActive && "animate-pulse"
                  )}
                >
                  {isActive && status === "running" && (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  )}
                  {stage.label}
                </Badge>
              );
            })}
          </div>

          {currentStage === "debating" && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                Debate Round {currentRound} of {totalRounds}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {agentRoles.map((role) => (
          <AgentCard
            key={role}
            role={role}
            status={getAgentStatus(role)}
            analysis={agents?.[role]?.analysis}
            isSpeaking={currentSpeaker === role}
          />
        ))}
      </div>
    </div>
  );
}
