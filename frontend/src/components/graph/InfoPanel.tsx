"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import type { Version, Critique } from "@/hooks/useGraphData";

interface InfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeData: Version | Critique | null;
  nodeType: "version" | "critique" | null;
}

const agentColors: Record<string, { name: string; color: string }> = {
  skeptic: { name: "The Skeptic", color: "text-amber-500" },
  statistician: { name: "The Statistician", color: "text-blue-500" },
  methodologist: { name: "The Methodologist", color: "text-purple-500" },
  ethicist: { name: "The Ethicist", color: "text-green-500" },
};

export function InfoPanel({ open, onOpenChange, nodeData, nodeType }: InfoPanelProps) {
  if (!nodeData || !nodeType) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {nodeType === "version" && (
          <>
            <SheetHeader>
              <SheetTitle>Version {(nodeData as Version).label}</SheetTitle>
              <SheetDescription>
                Created: {new Date((nodeData as Version).createdAt).toLocaleString()}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Severity Score</h3>
                <div className="text-3xl font-bold">
                  {(nodeData as Version).severityScore}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Critiques</h3>
                <p className="text-sm text-muted-foreground">
                  {(nodeData as Version).critiques.length} total critiques
                </p>
              </div>
            </div>
          </>
        )}

        {nodeType === "critique" && (
          <>
            <SheetHeader>
              <SheetTitle>Critique Details</SheetTitle>
              <SheetDescription>
                {(nodeData as Critique).text}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Agent</h3>
                <Badge variant="outline" className={agentColors[(nodeData as Critique).agent]?.color}>
                  {agentColors[(nodeData as Critique).agent]?.name || (nodeData as Critique).agent}
                </Badge>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Severity</h3>
                <div className="text-2xl font-bold">
                  {(nodeData as Critique).severity}/10
                </div>
              </div>
              {(nodeData as Critique).recurringWith && (nodeData as Critique).recurringWith!.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recurring Critique</h3>
                    <p className="text-sm text-muted-foreground">
                      This critique appears in {((nodeData as Critique).recurringWith?.length || 0) + 1} version(s)
                    </p>
                  </div>
                </>
              )}
              <Separator />
              <div className="space-y-2">
                <Link href="#transcript">
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    View in Transcript
                  </Button>
                </Link>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Blockchain Proof
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

