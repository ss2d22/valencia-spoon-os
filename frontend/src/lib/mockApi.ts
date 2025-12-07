// Mock API functions that return test data instead of making real API calls
import { mockSession, mockVerdict, mockDebateRounds, mockAgents, mockStatusProgression } from "./mockData";
import type { Verdict, DebateRound, AgentAnalysis, TribunalSession } from "./api";

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function submitPaper(file: File): Promise<{ session_id: string }> {
  await delay(500);
  return { session_id: "test-session-123" };
}

export async function submitText(
  text: string,
  title?: string
): Promise<{ session_id: string }> {
  await delay(500);
  return { session_id: "test-session-123" };
}

export async function getTribunalStatus(sessionId: string): Promise<TribunalSession> {
  await delay(300);
  
  // Simulate status progression for loading timeline
  const now = Date.now();
  let sessionStart = parseInt(sessionStorage.getItem(`session_start_${sessionId}`) || "0");
  
  if (sessionStart === 0) {
    sessionStart = now;
    sessionStorage.setItem(`session_start_${sessionId}`, now.toString());
  }
  
  const elapsed = now - sessionStart;
  
  // Find current stage based on elapsed time
  let currentStage = "upload";
  let status: "queued" | "running" | "completed" | "failed" = "running";
  
  // Always start with upload stage if just started
  if (elapsed < 100) {
    currentStage = "upload";
    status = "running";
  } else {
    // Find the current stage based on elapsed time
    for (const { stage, delay: stageDelay } of mockStatusProgression) {
      if (elapsed >= stageDelay) {
        currentStage = stage;
      }
    }
  }
  
  // Don't auto-complete - status remains "running" until user ends debate
  // The verdict will be generated when user clicks "End Debate" button
  
  return {
    ...mockSession,
    session_id: sessionId,
    status,
    current_stage: currentStage,
  };
}

export async function getVerdict(sessionId: string): Promise<Verdict> {
  await delay(300);
  return {
    ...mockVerdict,
    session_id: sessionId,
  };
}

export async function getDebateTranscript(
  sessionId: string
): Promise<{ debate_rounds: DebateRound[]; total_rounds: number }> {
  await delay(300);
  return {
    debate_rounds: mockDebateRounds,
    total_rounds: mockDebateRounds.length,
  };
}

export async function getAgentAnalyses(
  sessionId: string
): Promise<{ agents: Record<string, AgentAnalysis> }> {
  await delay(300);
  return {
    agents: mockAgents,
  };
}

export async function getAudioUrl(sessionId: string): Promise<{ audio_url: string }> {
  await delay(300);
  // Return a placeholder or mock audio URL
  return {
    audio_url: `https://example.com/audio/${sessionId}.mp3`,
  };
}

export async function searchVerdicts(
  query: string,
  limit = 10
): Promise<{ results: Verdict[] }> {
  await delay(300);
  return {
    results: [mockVerdict],
  };
}

export async function verifyNeoTransaction(
  txHash: string
): Promise<{ verified: boolean; tx_hash: string; block_height?: number }> {
  await delay(300);
  return {
    verified: true,
    tx_hash: txHash,
    block_height: 12345,
  };
}

export function getAudioStreamUrl(sessionId: string): string {
  return `https://example.com/api/tribunal/${sessionId}/audio`;
}

