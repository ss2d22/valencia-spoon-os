const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TribunalSession {
  session_id: string;
  status: "queued" | "running" | "completed" | "failed";
  current_stage?: string;
  progress?: {
    paper_title?: string;
    error?: string;
  };
}

export interface AgentAnalysis {
  agent: string;
  raw_response: string;
  concerns: Array<{
    title: string;
    evidence: string;
    severity: string;
  }>;
  severity: string;
  confidence: number;
}

export interface CriticalIssue {
  title: string;
  agent: string;
  severity: "FATAL_FLAW" | "SERIOUS_CONCERN" | "MINOR_ISSUE";
  description: string;
}

export interface Verdict {
  session_id: string;
  verdict: {
    summary: string;
    recommendation: string;
  };
  verdict_score: number;
  critical_issues: CriticalIssue[];
  neo_tx_hash?: string;
  aioz_verdict_key?: string;
  aioz_audio_key?: string;
}

export interface DebateRound {
  round_number: number;
  statements: Array<{
    agent: string;
    text: string;
    intensity: number;
  }>;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export async function submitPaper(file: File): Promise<{ session_id: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/tribunal/submit`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail);
  }

  return response.json();
}

export async function submitText(
  text: string,
  title?: string
): Promise<{ session_id: string }> {
  return fetchAPI("/api/tribunal/submit-text", {
    method: "POST",
    body: JSON.stringify({ text, title }),
  });
}

export async function getTribunalStatus(sessionId: string): Promise<TribunalSession> {
  return fetchAPI(`/api/tribunal/${sessionId}/status`);
}

export async function getVerdict(sessionId: string): Promise<Verdict> {
  return fetchAPI(`/api/tribunal/${sessionId}/verdict`);
}

export async function getDebateTranscript(
  sessionId: string
): Promise<{ debate_rounds: DebateRound[]; total_rounds: number }> {
  return fetchAPI(`/api/tribunal/${sessionId}/debate`);
}

export async function getAgentAnalyses(
  sessionId: string
): Promise<{ agents: Record<string, AgentAnalysis> }> {
  return fetchAPI(`/api/tribunal/${sessionId}/agents`);
}

export async function getAudioUrl(sessionId: string): Promise<{ audio_url: string }> {
  return fetchAPI(`/api/tribunal/${sessionId}/audio-url`);
}

export async function searchVerdicts(
  query: string,
  limit = 10
): Promise<{ results: Verdict[] }> {
  return fetchAPI(`/api/verdicts/search?query=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function verifyNeoTransaction(
  txHash: string
): Promise<{ verified: boolean; tx_hash: string; block_height?: number }> {
  return fetchAPI(`/api/neo/verify/${txHash}`);
}

export function getAudioStreamUrl(sessionId: string): string {
  return `${API_BASE}/api/tribunal/${sessionId}/audio`;
}
