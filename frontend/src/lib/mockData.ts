// Mock data for UI testing without backend
import type { Verdict, DebateRound, AgentAnalysis, TribunalSession } from "./api";

// Mock session data
export const mockSession: TribunalSession = {
  session_id: "test-session-123",
  status: "completed",
  current_stage: "completed",
  progress: {
    paper_title: "Neural Network Optimization Techniques",
  },
};

// Mock agent analyses
export const mockAgents: Record<string, AgentAnalysis> = {
  "The Skeptic": {
    agent: "The Skeptic",
    raw_response: "The paper presents interesting findings, but several alternative explanations were not adequately addressed...",
    concerns: [
      {
        title: "Alternative explanations not considered",
        evidence: "The authors did not discuss potential confounding variables",
        severity: "SERIOUS_CONCERN",
      },
      {
        title: "Sample size may be insufficient",
        evidence: "Only 30 participants were used in the study",
        severity: "MINOR_ISSUE",
      },
      {
        title: "Potential selection bias",
        evidence: "Participants were recruited from a single institution",
        severity: "SERIOUS_CONCERN",
      },
    ],
    severity: "SERIOUS_CONCERN",
    confidence: 78,
  },
  "The Statistician": {
    agent: "The Statistician",
    raw_response: "Statistical analysis reveals several concerns regarding p-hacking and multiple comparisons...",
    concerns: [
      {
        title: "Multiple comparisons not corrected",
        evidence: "20 statistical tests performed without Bonferroni correction",
        severity: "FATAL_FLAW",
      },
      {
        title: "Effect size not reported",
        evidence: "Only p-values provided, Cohen's d missing",
        severity: "SERIOUS_CONCERN",
      },
      {
        title: "Potential p-hacking detected",
        evidence: "Multiple analysis approaches tried until significance found",
        severity: "FATAL_FLAW",
      },
    ],
    severity: "FATAL_FLAW",
    confidence: 92,
  },
  "The Methodologist": {
    agent: "The Methodologist",
    raw_response: "The experimental design has several methodological weaknesses that could compromise validity...",
    concerns: [
      {
        title: "No control group",
        evidence: "Study lacks proper control condition",
        severity: "FATAL_FLAW",
      },
      {
        title: "Blinding not implemented",
        evidence: "Researchers were aware of condition assignments",
        severity: "SERIOUS_CONCERN",
      },
      {
        title: "Randomization unclear",
        evidence: "Method of randomization not described",
        severity: "MINOR_ISSUE",
      },
    ],
    severity: "FATAL_FLAW",
    confidence: 85,
  },
  "The Ethicist": {
    agent: "The Ethicist",
    raw_response: "Several ethical concerns and potential conflicts of interest were identified...",
    concerns: [
      {
        title: "Conflict of interest not disclosed",
        evidence: "Authors have financial ties to company producing tested product",
        severity: "SERIOUS_CONCERN",
      },
      {
        title: "Informed consent unclear",
        evidence: "Consent process not adequately described",
        severity: "MINOR_ISSUE",
      },
    ],
    severity: "SERIOUS_CONCERN",
    confidence: 70,
  },
};

// Mock debate rounds
export const mockDebateRounds: DebateRound[] = [
  {
    round_number: 1,
    statements: [
      {
        agent: "The Skeptic",
        text: "I'm concerned about the lack of alternative explanations. The authors seem to have jumped to conclusions without considering other possibilities.",
        intensity: 7,
      },
      {
        agent: "The Statistician",
        text: "I agree, and I've found serious statistical issues. Multiple comparisons were not corrected, which invalidates many of the reported findings.",
        intensity: 9,
      },
      {
        agent: "The Methodologist",
        text: "The experimental design itself is fundamentally flawed. Without a proper control group, we can't draw any meaningful conclusions.",
        intensity: 8,
      },
      {
        agent: "The Ethicist",
        text: "There are also ethical concerns. The authors have undisclosed conflicts of interest that should have been reported.",
        intensity: 6,
      },
    ],
  },
  {
    round_number: 2,
    statements: [
      {
        agent: "The Statistician",
        text: "The p-hacking is particularly egregious. I found evidence that multiple analysis approaches were tried until significance was achieved.",
        intensity: 10,
      },
      {
        agent: "The Methodologist",
        text: "Even if the statistics were sound, the lack of blinding means the results could be biased by experimenter expectations.",
        intensity: 8,
      },
      {
        agent: "The Skeptic",
        text: "And we still haven't addressed the alternative explanations. This could all be explained by confounding variables.",
        intensity: 7,
      },
    ],
  },
  {
    round_number: 3,
    statements: [
      {
        agent: "The Ethicist",
        text: "Given the conflicts of interest and the methodological issues, I cannot recommend this paper for publication in its current form.",
        intensity: 8,
      },
      {
        agent: "The Statistician",
        text: "I concur. The statistical flaws alone are fatal. This needs a complete re-analysis with proper corrections.",
        intensity: 9,
      },
      {
        agent: "The Methodologist",
        text: "The experimental design must be redesigned with proper controls and blinding before any conclusions can be drawn.",
        intensity: 8,
      },
    ],
  },
];

// Mock verdict
export const mockVerdict: Verdict = {
  session_id: "test-session-123",
  verdict: {
    summary: "The paper presents interesting findings but contains several critical flaws that prevent publication in its current form. Multiple statistical errors, methodological weaknesses, and ethical concerns were identified by the tribunal.",
    recommendation: "Major revisions required. The authors must address all fatal flaws, particularly the statistical issues and experimental design problems, before resubmission.",
  },
  verdict_score: 42,
  critical_issues: [
    {
      title: "Multiple comparisons not corrected",
      agent: "The Statistician",
      severity: "FATAL_FLAW",
      description: "20 statistical tests performed without Bonferroni correction, invalidating reported p-values",
    },
    {
      title: "Potential p-hacking detected",
      agent: "The Statistician",
      severity: "FATAL_FLAW",
      description: "Multiple analysis approaches tried until significance found, suggesting data dredging",
    },
    {
      title: "No control group",
      agent: "The Methodologist",
      severity: "FATAL_FLAW",
      description: "Study lacks proper control condition, making it impossible to draw causal conclusions",
    },
    {
      title: "Blinding not implemented",
      agent: "The Methodologist",
      severity: "SERIOUS_CONCERN",
      description: "Researchers were aware of condition assignments, introducing potential bias",
    },
    {
      title: "Conflict of interest not disclosed",
      agent: "The Ethicist",
      severity: "SERIOUS_CONCERN",
      description: "Authors have financial ties to company producing tested product, not disclosed in paper",
    },
    {
      title: "Alternative explanations not considered",
      agent: "The Skeptic",
      severity: "SERIOUS_CONCERN",
      description: "Authors did not discuss potential confounding variables or alternative explanations",
    },
    {
      title: "Effect size not reported",
      agent: "The Statistician",
      severity: "SERIOUS_CONCERN",
      description: "Only p-values provided, Cohen's d and other effect size measures missing",
    },
    {
      title: "Randomization unclear",
      agent: "The Methodologist",
      severity: "MINOR_ISSUE",
      description: "Method of randomization not adequately described in methods section",
    },
    {
      title: "Informed consent unclear",
      agent: "The Ethicist",
      severity: "MINOR_ISSUE",
      description: "Consent process not adequately described in ethics section",
    },
  ],
  neo_tx_hash: "0x1234567890abcdef1234567890abcdef12345678",
  aioz_verdict_key: "verdict/test-session-123.json",
  aioz_audio_key: "audio/test-session-123.mp3",
};

// Mock status progression for loading timeline
export const mockStatusProgression = [
  { stage: "upload", delay: 0 },
  { stage: "parsing", delay: 1000 },
  { stage: "skeptic", delay: 2000 },
  { stage: "skeptic_complete", delay: 4000 },
  { stage: "statistician", delay: 5000 },
  { stage: "statistician_complete", delay: 7000 },
  { stage: "methodologist", delay: 8000 },
  { stage: "methodologist_complete", delay: 10000 },
  { stage: "ethicist", delay: 11000 },
  { stage: "ethicist_complete", delay: 13000 },
];

