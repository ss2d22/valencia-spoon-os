"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Scale,
  Shield,
  Send,
  Loader2,
  Gavel,
  User,
  MessageCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Keyboard,
  X,
} from "lucide-react";
import {
  sendInteractiveMessage,
  requestInteractiveVerdict,
  synthesizeSpeech,
  sendVoiceMessage,
  audioToBase64,
  base64ToAudioBlob,
  type AgentResponse,
  type InteractiveVerdict,
} from "@/lib/api";
import { useVoiceRecorder, formatDuration } from "@/hooks/useVoiceRecorder";
import { formatMarkdown } from "@/lib/formatMarkdown";
import { useLanguage } from "@/lib/i18n";

interface Message {
  id: string;
  type: "human" | "agent" | "system";
  agent?: string;
  agentKey?: string;
  content: string;
  timestamp: Date;
}

interface InteractiveTribunalProps {
  sessionId: string;
  paperTitle: string;
  openingStatements: Array<{
    agent: string;
    agent_key: string;
    severity: string;
    statement: string;
  }>;
  analyses: Record<string, { severity: string }>;
}

const agentConfig: Record<string, {
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
  glowColor: string;
}> = {
  skeptic: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    glowColor: "shadow-orange-500/50",
  },
  statistician: {
    icon: BarChart3,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    glowColor: "shadow-blue-500/50",
  },
  methodologist: {
    icon: Scale,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    glowColor: "shadow-purple-500/50",
  },
  ethicist: {
    icon: Shield,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    glowColor: "shadow-green-500/50",
  },
};

const severityColors: Record<string, string> = {
  FATAL_FLAW: "bg-red-500/20 text-red-400 border-red-500/30",
  SERIOUS_CONCERN: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MINOR_ISSUE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ACCEPTABLE: "bg-green-500/20 text-green-400 border-green-500/30",
  UNKNOWN: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function InteractiveTribunal({
  sessionId,
  paperTitle,
  openingStatements,
  analyses,
}: InteractiveTribunalProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verdict, setVerdict] = useState<InteractiveVerdict | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showTextInput, setShowTextInput] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [hasPlayedOpening, setHasPlayedOpening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<Array<{ audio: string; agent: string }>>([]);

  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    audioBlob,
    isSupported: voiceSupported,
  } = useVoiceRecorder({
    maxDuration: 30000,
  });

  const playAudioBlob = useCallback(async (blob: Blob, agentKey?: string) => {
    if (!voiceEnabled) return;

    const url = URL.createObjectURL(blob);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => {
      setIsPlayingAudio(true);
      if (agentKey) setCurrentSpeaker(agentKey);
    };
    audio.onended = () => {
      setIsPlayingAudio(false);
      setCurrentSpeaker(null);
      URL.revokeObjectURL(url);
      if (audioQueueRef.current.length > 0) {
        const next = audioQueueRef.current.shift();
        if (next) {
          const nextBlob = base64ToAudioBlob(next.audio);
          playAudioBlob(nextBlob, next.agent);
        }
      } else if (voiceSupported && !verdict) {
        setIsListening(true);
        startRecording();
      }
    };
    audio.onerror = () => {
      setIsPlayingAudio(false);
      setCurrentSpeaker(null);
      URL.revokeObjectURL(url);
    };

    await audio.play().catch(() => {
      setIsPlayingAudio(false);
      setCurrentSpeaker(null);
    });
  }, [voiceEnabled, voiceSupported, verdict, startRecording]);

  useEffect(() => {
    if (hasPlayedOpening || !voiceEnabled) return;

    const playOpeningStatements = async () => {
      setHasPlayedOpening(true);

      const initialMessages: Message[] = [
        {
          id: "system-intro",
          type: "system",
          content: `${t.session.tribunalInSession} "${paperTitle}".`,
          timestamp: new Date(),
        },
        ...openingStatements.map((stmt, i) => ({
          id: `opening-${i}`,
          type: "agent" as const,
          agent: stmt.agent,
          agentKey: stmt.agent_key,
          content: stmt.statement,
          timestamp: new Date(),
        })),
      ];
      setMessages(initialMessages);

      const audioPromises = openingStatements.map(async (stmt) => {
        try {
          const audioBlob = await synthesizeSpeech(stmt.statement, stmt.agent_key, 0.6);
          const base64 = await audioToBase64(audioBlob);
          return { audio: base64, agent: stmt.agent_key };
        } catch (e) {
          console.error("Failed to synthesize opening:", e);
          return null;
        }
      });

      const audioResults = await Promise.all(audioPromises);
      const validAudio = audioResults.filter((a): a is { audio: string; agent: string } => a !== null);

      if (validAudio.length > 0) {
        audioQueueRef.current = validAudio.slice(1);
        const firstBlob = base64ToAudioBlob(validAudio[0].audio);
        playAudioBlob(firstBlob, validAudio[0].agent);
      }
    };

    playOpeningStatements();
  }, [hasPlayedOpening, voiceEnabled, paperTitle, openingStatements, playAudioBlob]);

  useEffect(() => {
    if (audioBlob && !isRecording) {
      setIsListening(false);
      handleVoiceSubmit(audioBlob);
    }
  }, [audioBlob, isRecording]);

  const handleVoiceSubmit = async (blob: Blob) => {
    setIsLoading(true);
    try {
      const base64 = await audioToBase64(blob);
      const response = await sendVoiceMessage(sessionId, base64);

      if (response.error || !response.user_text) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            type: "system",
            content: response.error || "Could not understand audio",
            timestamp: new Date(),
          },
        ]);
        if (voiceSupported && !verdict) {
          setIsListening(true);
          startRecording();
        }
        return;
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: "human",
        content: response.user_text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      if (response.verdict) {
        const voiceVerdict = response.verdict;

        setMessages((prev) => [
          ...prev,
          {
            id: `verdict-${Date.now()}`,
            type: "system",
            content: `${t.verdict.tribunalReachedVerdict}: ${voiceVerdict.decision}. Score: ${voiceVerdict.score}/100`,
            timestamp: new Date(),
          },
        ]);

        setVerdict({
          score: voiceVerdict.score,
          verdict: {
            summary: voiceVerdict.summary,
            score: voiceVerdict.score,
            severities: [],
            total_concerns: voiceVerdict.critical_issues.length,
            critical_concerns: voiceVerdict.critical_issues.length,
            debate_rounds: messages.filter((m) => m.type === "human").length,
          },
          critical_issues: voiceVerdict.critical_issues.map((issue) => ({
            title: issue,
            severity: "SERIOUS_CONCERN",
            evidence: "",
          })),
          neo_tx_hash: voiceVerdict.neo_tx_hash,
          mem0_stored: voiceVerdict.mem0_stored,
        });

        const verdictAudio = response.responses.find((r) => r.agent_key === "verdict");
        if (verdictAudio?.audio_base64 && voiceEnabled) {
          const audioBlob = base64ToAudioBlob(verdictAudio.audio_base64);
          playAudioBlob(audioBlob, "verdict");
        }
        return;
      }

      const agentMessages: Message[] = response.responses.map((r, i) => ({
        id: `agent-${Date.now()}-${i}`,
        type: "agent" as const,
        agent: r.agent,
        agentKey: r.agent_key,
        content: r.text,
        timestamp: new Date(),
      }));
      setMessages((prev) => [...prev, ...agentMessages]);

      const audioResponses = response.responses
        .filter((r) => r.audio_base64)
        .map((r) => ({ audio: r.audio_base64!, agent: r.agent_key }));

      if (audioResponses.length > 0 && voiceEnabled) {
        audioQueueRef.current = audioResponses.slice(1);
        const firstBlob = base64ToAudioBlob(audioResponses[0].audio);
        playAudioBlob(firstBlob, audioResponses[0].agent);
      } else if (voiceSupported && !verdict) {
        setIsListening(true);
        startRecording();
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "system",
          content: `Error: ${error instanceof Error ? error.message : "Voice processing failed"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (isRecording) {
      stopRecording();
      setIsListening(false);
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "human",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendInteractiveMessage(sessionId, userMessage.content);

      const agentMessages: Message[] = response.responses.map((r: AgentResponse, i: number) => ({
        id: `agent-${Date.now()}-${i}`,
        type: "agent" as const,
        agent: r.agent,
        agentKey: r.agent_key,
        content: r.response,
        timestamp: new Date(),
      }));

      setMessages((prev) => [...prev, ...agentMessages]);

      if (voiceEnabled) {
        for (let i = 0; i < response.responses.length; i++) {
          const r = response.responses[i];
          try {
            const audioBlob = await synthesizeSpeech(r.response, r.agent_key, 0.5);
            if (i === 0 && !isPlayingAudio) {
              playAudioBlob(audioBlob, r.agent_key);
            } else {
              const base64 = await audioToBase64(audioBlob);
              audioQueueRef.current.push({ audio: base64, agent: r.agent_key });
            }
          } catch (e) {
            console.error("Failed to synthesize:", e);
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "system",
          content: `Error: ${error instanceof Error ? error.message : "Failed to send message"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleRequestVerdict = async () => {
    if (isRecording) {
      stopRecording();
      setIsListening(false);
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioQueueRef.current = [];

    setIsLoading(true);
    try {
      const verdictResponse = await requestInteractiveVerdict(sessionId);
      setVerdict(verdictResponse);
      setMessages((prev) => [
        ...prev,
        {
          id: `verdict-${Date.now()}`,
          type: "system",
          content: `${t.verdict.tribunalReachedVerdict}: ${verdictResponse.verdict.summary} (Score: ${verdictResponse.score}/100)`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "system",
          content: `Error requesting verdict: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isRecording) {
      stopRecording();
      setIsListening(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
        setCurrentSpeaker(null);
      }
      audioQueueRef.current = [];
      setIsListening(true);
      startRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAgentName = (key: string): string => {
    const agentNames: Record<string, keyof typeof t.agents> = {
      skeptic: "theSkeptic",
      statistician: "theStatistician",
      methodologist: "theMethodologist",
      ethicist: "theEthicist",
    };
    const translationKey = agentNames[key];
    return translationKey ? t.agents[translationKey] : key;
  };

  const getSeverityLabel = (severity: string): string => {
    const severityMap: Record<string, keyof typeof t.severity> = {
      FATAL_FLAW: "fatalFlaw",
      SERIOUS_CONCERN: "seriousConcern",
      MINOR_ISSUE: "minorIssue",
      ACCEPTABLE: "acceptable",
      UNKNOWN: "unknown",
    };
    const translationKey = severityMap[severity];
    return translationKey ? t.severity[translationKey] : severity.replace("_", " ");
  };

  const renderAgentPanel = () => (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {Object.entries(analyses).map(([key, { severity }]) => {
        const config = agentConfig[key];
        if (!config) return null;
        const Icon = config.icon;
        const isSpeaking = currentSpeaker === key;
        const agentName = getAgentName(key);

        return (
          <div
            key={key}
            className={cn(
              "relative flex flex-col items-center p-4 rounded-xl transition-all duration-300",
              config.bgColor,
              isSpeaking && "ring-2 ring-offset-2 ring-offset-background animate-pulse",
              isSpeaking && config.glowColor,
              isSpeaking && "shadow-lg scale-105"
            )}
          >
            <Avatar className={cn(
              "h-16 w-16 mb-2 transition-all duration-300",
              isSpeaking && "animate-bounce"
            )}>
              <AvatarFallback className={cn("bg-transparent", config.color)}>
                <Icon className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <span className={cn("text-sm font-medium", config.color)}>
              {agentName}
            </span>
            <Badge
              variant="outline"
              className={cn("text-xs mt-1", severityColors[severity])}
            >
              {getSeverityLabel(severity)}
            </Badge>
            {isSpeaking && (
              <div className="absolute -top-2 -right-2">
                <div className="flex items-center gap-1 bg-background px-2 py-1 rounded-full shadow-lg">
                  <Volume2 className="h-3 w-3 text-primary animate-pulse" />
                  <span className="text-xs text-primary">{t.session.speaking}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderMessage = (message: Message) => {
    if (message.type === "system") {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm text-muted-foreground max-w-2xl text-center">
            {formatMarkdown(message.content)}
          </div>
        </div>
      );
    }

    if (message.type === "human") {
      return (
        <div key={message.id} className="flex justify-end my-3">
          <div className="flex items-start gap-3 max-w-[80%]">
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3">
              <p className="text-sm">{formatMarkdown(message.content)}</p>
            </div>
            <Avatar className="h-8 w-8 bg-primary/20">
              <AvatarFallback className="bg-transparent text-primary">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      );
    }

    const agentKey = message.agentKey || "skeptic";
    const config = agentConfig[agentKey] || agentConfig.skeptic;
    const Icon = config.icon;
    const severity = analyses[agentKey]?.severity;
    const isSpeaking = currentSpeaker === agentKey;

    return (
      <div key={message.id} className="flex justify-start my-3">
        <div className={cn(
          "flex items-start gap-3 max-w-[80%] transition-all duration-300",
          isSpeaking && "scale-102"
        )}>
          <Avatar className={cn(
            "h-8 w-8 transition-all duration-300",
            config.bgColor,
            isSpeaking && "ring-2 ring-primary animate-pulse"
          )}>
            <AvatarFallback className={cn("bg-transparent", config.color)}>
              <Icon className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", config.color)}>
                {message.agent}
              </span>
              {severity && (
                <Badge variant="outline" className={cn("text-xs", severityColors[severity])}>
                  {getSeverityLabel(severity)}
                </Badge>
              )}
              {isSpeaking && (
                <Volume2 className="h-3 w-3 text-primary animate-pulse" />
              )}
            </div>
            <div className={cn(
              "bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 transition-all duration-300",
              isSpeaking && "ring-1 ring-primary/50"
            )}>
              <p className="text-sm whitespace-pre-wrap">{formatMarkdown(message.content)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t.session.liveTribunalSession}</CardTitle>
                <p className="text-xs text-muted-foreground truncate max-w-xs">
                  {paperTitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (audioRef.current) {
                    audioRef.current.pause();
                    setIsPlayingAudio(false);
                    setCurrentSpeaker(null);
                  }
                }}
                title={voiceEnabled ? "Mute voices" : "Enable voices"}
              >
                {voiceEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="px-4 py-4 border-b bg-muted/20">
          {renderAgentPanel()}
        </div>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.map(renderMessage)}
          {isLoading && (
            <div className="flex justify-start my-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.session.agentsDeliberating}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          {verdict ? (
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    verdict.score >= 70 ? "bg-green-500/20" :
                    verdict.score >= 40 ? "bg-yellow-500/20" : "bg-red-500/20"
                  )}>
                    <Gavel className={cn(
                      "h-6 w-6",
                      verdict.score >= 70 ? "text-green-500" :
                      verdict.score >= 40 ? "text-yellow-500" : "text-red-500"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t.verdict.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {verdict.verdict.debate_rounds} {t.verdict.debateRoundsCompleted}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-4xl font-bold",
                    verdict.score >= 70 ? "text-green-500" :
                    verdict.score >= 40 ? "text-yellow-500" : "text-red-500"
                  )}>
                    {verdict.score}
                  </p>
                  <p className="text-sm text-muted-foreground">/ 100</p>
                </div>
              </div>

              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-sm leading-relaxed">{formatMarkdown(verdict.verdict.summary || "")}</p>
              </div>

              {verdict.critical_issues && verdict.critical_issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    {t.verdict.criticalIssues} ({verdict.critical_issues.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {verdict.critical_issues.map((issue, i) => {
                      const issueText = typeof issue === "string" ? issue : issue.title;
                      const severity = typeof issue === "string" ? "SERIOUS_CONCERN" : issue.severity;
                      return (
                        <div key={i} className="bg-background/50 rounded-lg px-3 py-2 flex items-start gap-2">
                          <Badge variant="outline" className={cn(
                            "text-xs shrink-0",
                            severity === "FATAL_FLAW" ? "border-red-500 text-red-500" :
                            severity === "SERIOUS_CONCERN" ? "border-orange-500 text-orange-500" :
                            "border-yellow-500 text-yellow-500"
                          )}>
                            {getSeverityLabel(severity)}
                          </Badge>
                          <span className="text-sm">{formatMarkdown(issueText)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <span>{verdict.verdict.total_concerns} {t.verdict.concernsIdentified}</span>
                <span>{verdict.verdict.critical_concerns} {t.verdict.critical}</span>
              </div>

              <div className="flex items-center justify-between text-xs border-t pt-3 gap-4">
                <div className="flex items-center gap-2">
                  {verdict.mem0_stored ? (
                    <span className="text-green-500 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {t.session.mem0Stored}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                      Mem0
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {verdict.neo_tx_hash ? (
                    <span className="text-green-500 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Neo: {verdict.neo_tx_hash.slice(0, 10)}...
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                      {t.session.neoPending}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="lg"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={cn(
                    "h-16 w-16 rounded-full transition-all duration-300",
                    isRecording && "animate-pulse ring-4 ring-red-500/50",
                    isListening && !isRecording && "ring-4 ring-primary/50"
                  )}
                >
                  {isRecording ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {isRecording ? (
                  <span className="text-red-500 animate-pulse">
                    {t.session.recording} {formatDuration(duration)} ({t.session.tapToStop})
                  </span>
                ) : isPlayingAudio ? (
                  <span className="text-primary animate-pulse">
                    {currentSpeaker ? `${getAgentName(currentSpeaker)} ${t.session.isSpeaking}` : t.session.agentSpeaking}
                  </span>
                ) : isLoading ? (
                  <span>{t.session.processing}</span>
                ) : (
                  <span>{t.session.tapMicrophone}</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTextInput(!showTextInput)}
                  className="gap-2"
                >
                  <Keyboard className="h-4 w-4" />
                  {showTextInput ? t.session.hide : t.session.typeInstead}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestVerdict}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Gavel className="h-4 w-4" />
                  {t.session.requestVerdict}
                </Button>
              </div>

              {showTextInput && (
                <div className="flex gap-2 pt-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t.session.typeQuestion}
                      className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-12 max-h-[120px]"
                      rows={1}
                      disabled={isLoading}
                    />
                    <Button
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={handleSendMessage}
                      disabled={!input.trim() || isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTextInput(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
