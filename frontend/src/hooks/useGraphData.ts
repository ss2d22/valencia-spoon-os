import { useState, useEffect } from "react";

export interface Version {
  id: string;
  label: string;
  createdAt: string;
  severityScore: number;
  critiques: Critique[];
}

export interface Critique {
  id: string;
  text: string;
  agent: "skeptic" | "statistician" | "methodologist" | "ethicist";
  severity: number;
  recurringWith?: string[];
}

export interface GraphData {
  versions: Version[];
}

export function useGraphData(paperId?: string): { data: GraphData | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const mockData: GraphData = {
      versions: [
        {
          id: "v1.0",
          label: "v1.0",
          createdAt: "2024-01-15T10:00:00Z",
          severityScore: 65,
          critiques: [
            {
              id: "c1",
              text: "Sample size is insufficient for statistical power",
              agent: "statistician",
              severity: 8,
            },
            {
              id: "c2",
              text: "Lack of control group undermines causality claims",
              agent: "methodologist",
              severity: 9,
            },
            {
              id: "c3",
              text: "Alternative explanations not considered",
              agent: "skeptic",
              severity: 7,
            },
          ],
        },
        {
          id: "v1.1",
          label: "v1.1",
          createdAt: "2024-01-20T14:30:00Z",
          severityScore: 72,
          critiques: [
            {
              id: "c4",
              text: "Sample size is insufficient for statistical power",
              agent: "statistician",
              severity: 6,
              recurringWith: ["c1"], // Recurring from v1.0
            },
            {
              id: "c5",
              text: "Ethical concerns with participant consent",
              agent: "ethicist",
              severity: 5,
            },
          ],
        },
        {
          id: "v2.0",
          label: "v2.0",
          createdAt: "2024-01-25T09:15:00Z",
          severityScore: 85,
          critiques: [
            {
              id: "c6",
              text: "Minor methodological improvements needed",
              agent: "methodologist",
              severity: 3,
            },
          ],
        },
      ],
    };

    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 500);
  }, [paperId]);

  return { data, loading, error };
}

