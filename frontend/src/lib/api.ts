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

// Interactive Tribunal API

export interface InteractiveSession {
  session_id: string;
  paper_title: string;
  analyses: Record<string, { severity: string }>;
  opening_statements: Array<{
    agent: string;
    agent_key: string;
    severity: string;
    statement: string;
  }>;
}

export interface AgentResponse {
  agent: string;
  agent_key: string;
  response: string;
}

export interface SendMessageResponse {
  responses: AgentResponse[];
  addressed_agents: string[];
}

export interface InteractiveVerdict {
  verdict: {
    summary: string;
    score: number;
    severities: string[];
    total_concerns: number;
    critical_concerns: number;
    debate_rounds: number;
  };
  score: number;
  critical_issues: Array<{
    title: string;
    severity: string;
    evidence: string;
  }>;
}

export async function startInteractiveSession(
  text: string,
  title?: string
): Promise<InteractiveSession> {
  return fetchAPI("/api/interactive/start", {
    method: "POST",
    body: JSON.stringify({ text, title }),
  });
}

export async function startInteractiveSessionPdf(
  file: File
): Promise<InteractiveSession> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/interactive/start-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail);
  }

  return response.json();
}

export async function sendInteractiveMessage(
  sessionId: string,
  message: string,
  interrupt = false
): Promise<SendMessageResponse> {
  return fetchAPI(`/api/interactive/${sessionId}/message`, {
    method: "POST",
    body: JSON.stringify({ message, interrupt }),
  });
}

export async function interruptSpeaker(
  sessionId: string
): Promise<{ status: string; agent: string | null }> {
  return fetchAPI(`/api/interactive/${sessionId}/interrupt`, {
    method: "POST",
  });
}

export async function requestInteractiveVerdict(
  sessionId: string
): Promise<InteractiveVerdict> {
  return fetchAPI(`/api/interactive/${sessionId}/request-verdict`, {
    method: "POST",
  });
}

// Voice API

export interface VoiceAgentResponse {
  agent: string;
  agent_key: string;
  text: string;
  audio_base64: string | null;
}

export interface VoiceMessageResponse {
  user_text: string;
  responses: VoiceAgentResponse[];
  error?: string;
}

export async function transcribeAudio(
  audioBase64: string,
  language = "en"
): Promise<{ text: string; language: string }> {
  return fetchAPI("/api/voice/transcribe", {
    method: "POST",
    body: JSON.stringify({ audio_base64: audioBase64, language }),
  });
}

export async function synthesizeSpeech(
  text: string,
  agent = "Narrator",
  intensity = 0.5
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/voice/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, agent, intensity }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Synthesis failed" }));
    throw new Error(error.detail);
  }

  return response.blob();
}

export async function sendVoiceMessage(
  sessionId: string,
  audioBase64: string,
  language = "en"
): Promise<VoiceMessageResponse> {
  return fetchAPI("/api/voice/voice-message", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      audio_base64: audioBase64,
      language,
    }),
  });
}

export function getVoiceWebSocketUrl(sessionId: string): string {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return `${wsBase}/api/voice/ws/${sessionId}`;
}

// Helper to convert audio blob to base64
export async function audioToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Data = base64.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper to convert base64 to audio blob
export function base64ToAudioBlob(base64: string, mimeType = "audio/mpeg"): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
