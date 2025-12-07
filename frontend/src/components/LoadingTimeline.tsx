"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface TimelineStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete";
}

interface LoadingTimelineProps {
  currentStage?: string;
  status: "queued" | "running" | "completed" | "failed";
  stages?: Array<{ id: string; label: string }>;
}

const defaultStages = [
  { id: "upload", label: "Paper uploaded" },
  { id: "parsing", label: "Metadata extracted" },
  { id: "skeptic", label: "Initializing The Skeptic…" },
  { id: "skeptic_complete", label: "Skeptic completed first pass" },
  { id: "statistician", label: "Running The Statistician…" },
  { id: "statistician_complete", label: "Statistician completed analysis" },
  { id: "methodologist", label: "Running The Methodologist…" },
  { id: "methodologist_complete", label: "Methodologist completed review" },
  { id: "ethicist", label: "Running The Ethicist…" },
  { id: "ethicist_complete", label: "Ethicist completed evaluation" },
];

export function LoadingTimeline({
  currentStage,
  status,
  stages = defaultStages,
}: LoadingTimelineProps) {
  const getStepStatus = (stepId: string, index: number): "pending" | "active" | "complete" => {
    if (status === "queued") {
      return index === 0 ? "active" : "pending";
    }

    if (!currentStage) {
      return index === 0 && status === "running" ? "active" : "pending";
    }

    const currentIndex = stages.findIndex((s) => s.id === currentStage);

    if (currentIndex < 0 && currentStage.includes("_complete")) {
      const baseStage = currentStage.replace("_complete", "");
      const baseIndex = stages.findIndex((s) => s.id === baseStage);
      if (baseIndex >= 0) {
        if (index <= baseIndex) return "complete";
        if (index === baseIndex + 1) return "active";
      }
      return "pending";
    }

    if (currentIndex < 0) {
      return index === 0 ? "active" : "pending";
    }

    if (index < currentIndex) return "complete";
    if (index === currentIndex && status === "running") return "active";
    if (index === currentIndex && status === "completed") return "complete";
    return "pending";
  };

  const completedSteps = stages.filter((_, i) => {
    const stepStatus = getStepStatus(stages[i].id, i);
    return stepStatus === "complete";
  }).length;

  const activeStepIndex = stages.findIndex((s) => {
    const status = getStepStatus(s.id, stages.indexOf(s));
    return status === "active";
  });

  let progress = (completedSteps / stages.length) * 100;

  if (activeStepIndex >= 0 && status === "running") {
    progress += (1 / stages.length) * 50;
  }

  progress = Math.min(100, progress);

  return (
    <Card className="glass-card border-slate-800/50 max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Initialization Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-4">
            {stages.map((stage, index) => {
              const stepStatus = getStepStatus(stage.id, index);

              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex items-center gap-3 transition-all duration-500",
                    stepStatus === "pending" && "opacity-60"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <div className="flex-shrink-0">
                    {stepStatus === "complete" ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : stepStatus === "active" ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        "text-sm transition-colors",
                        stepStatus === "complete" && "text-foreground",
                        stepStatus === "active" && "text-primary font-medium",
                        stepStatus === "pending" && "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

