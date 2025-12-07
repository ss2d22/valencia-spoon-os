"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  AlertTriangle,
  BarChart3,
  Scale,
  Shield,
  User,
} from "lucide-react";
import type { AgentAnalysis } from "@/lib/api";

interface DebateViewProps {
  agents: Record<string, AgentAnalysis>;
  sessionId: string;
  onUserMessage?: (message: string) => void;
  onTranscriptChange?: (transcript: TranscriptEntry[]) => void;
}

const agentConfig: Record<string, {
  name: string;
  icon: typeof AlertTriangle;
  bgColor: string;
}> = {
  "The Skeptic": {
    name: "The Skeptic",
    icon: AlertTriangle,
    bgColor: "bg-black"
  },
  "The Statistician": {
    name: "The Statistician",
    icon: BarChart3,
    bgColor: "bg-black"
  },
  "The Methodologist": {
    name: "The Methodologist",
    icon: Scale,
    bgColor: "bg-black"
  },
  "The Ethicist": {
    name: "The Ethicist",
    icon: Shield,
    bgColor: "bg-black"
  },
};

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: Date;
  isUser?: boolean;
}

// Mock agent responses based on user input
const generateAgentResponse = (userMessage: string, agentName: string): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (agentName === "The Skeptic") {
    if (lowerMessage.includes("statistic") || lowerMessage.includes("data")) {
      return "While the statistics may appear sound, I'm concerned about alternative explanations that weren't considered. Could confounding variables explain these results?";
    }
    if (lowerMessage.includes("method") || lowerMessage.includes("design")) {
      return "The methodology seems reasonable, but have you considered other experimental approaches that might yield different conclusions?";
    }
    return "That's an interesting point, but I'd like to explore alternative explanations. What if the observed effect is actually due to a different mechanism?";
  }
  
  if (agentName === "The Statistician") {
    if (lowerMessage.includes("sample") || lowerMessage.includes("size")) {
      return "The sample size is a concern. With only 30 participants, the statistical power may be insufficient to detect meaningful effects. Have you calculated the effect size?";
    }
    if (lowerMessage.includes("significant") || lowerMessage.includes("p-value")) {
      return "I notice multiple statistical tests were performed. Were these corrected for multiple comparisons? Without correction, the p-values may be misleading.";
    }
    return "From a statistical perspective, I'd like to see more rigorous analysis. Can you provide effect sizes and confidence intervals, not just p-values?";
  }
  
  if (agentName === "The Methodologist") {
    if (lowerMessage.includes("control") || lowerMessage.includes("group")) {
      return "A proper control group is essential for establishing causality. Without it, we can't rule out alternative explanations for the observed effects.";
    }
    if (lowerMessage.includes("blind") || lowerMessage.includes("bias")) {
      return "Blinding is crucial to prevent experimenter bias. Were the researchers aware of condition assignments during data collection?";
    }
    return "The experimental design needs improvement. I'd recommend adding proper controls and implementing blinding procedures to strengthen the validity of your conclusions.";
  }
  
  if (agentName === "The Ethicist") {
    if (lowerMessage.includes("conflict") || lowerMessage.includes("interest")) {
      return "Transparency about potential conflicts of interest is essential for scientific integrity. Were all financial relationships disclosed?";
    }
    if (lowerMessage.includes("consent") || lowerMessage.includes("ethics")) {
      return "Ethical considerations are paramount. Can you clarify how informed consent was obtained and whether the study was approved by an ethics board?";
    }
    return "I'm concerned about potential ethical issues. Have all conflicts of interest been disclosed, and were participants properly informed about the study's risks?";
  }
  
  return "Thank you for that clarification. I'd like to explore this further.";
};

export function DebateView({
  agents,
  sessionId,
  onUserMessage,
  onTranscriptChange,
}: DebateViewProps) {
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Get all 4 agents
  const allAgents = Object.keys(agentConfig);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Notify parent of transcript changes
  useEffect(() => {
    if (onTranscriptChange) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // In a real implementation, this would send audio to backend for transcription
        // For now, we'll simulate transcription with a mock message
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // Simulate transcription (in real app, send to backend)
        const mockTranscription = "I'd like to address the statistical concerns raised about my paper.";
        
        handleUserMessage(mockTranscription);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleUserMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isProcessing) return;
    
    // Add user message to transcript
    const userEntry: TranscriptEntry = {
      speaker: "You",
      text: userMessage,
      timestamp: new Date(),
      isUser: true,
    };

    setTranscript((prev) => [...prev, userEntry]);
    setIsProcessing(true);
    
    // Call the callback
    onUserMessage?.(userMessage);

    // Simulate agent responses (in real implementation, this would be an API call)
    // Randomly select 1-2 agents to respond
    const respondingAgents = allAgents
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 2) + 1);

    // Add agent responses with delays to simulate thinking
    for (let i = 0; i < respondingAgents.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000 + i * 500));
      
      const agentName = respondingAgents[i];
      const response = generateAgentResponse(userMessage, agentName);
      
      setCurrentSpeaker(agentName);
      
      const agentEntry: TranscriptEntry = {
        speaker: agentName,
        text: response,
        timestamp: new Date(),
        isUser: false,
      };

      setTranscript((prev) => [...prev, agentEntry]);
      
      // Clear speaking indicator after a delay
      setTimeout(() => {
        setCurrentSpeaker(null);
      }, 2000);
    }

    setIsProcessing(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main grid layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Agent panels grid - 2x2 layout */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {allAgents.map((agentName) => {
            const config = agentConfig[agentName];
            const Icon = config.icon;
            const isSpeaking = currentSpeaker === agentName;

            return (
              <Card
                key={agentName}
                className={cn(
                  "relative overflow-hidden transition-all",
                  isSpeaking && "ring-2 ring-primary shadow-lg shadow-primary/20"
                )}
              >
                {isSpeaking && (
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                )}
                <CardContent className="p-4 h-full flex flex-col items-center justify-center space-y-2">
                  <Avatar className={cn("h-12 w-12", config.bgColor)}>
                    <AvatarFallback className="bg-transparent">
                      <Icon className="h-6 w-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-medium text-xs">{config.name}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {agents[agentName]?.severity || "Ready"}
                    </Badge>
                  </div>
                  {isSpeaking && (
                    <div className="flex items-center justify-center gap-1 py-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full speaking-bar"
                          style={{
                            height: "12px",
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Transcript panel */}
        <div className="lg:col-span-1 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="flex-1 flex flex-col p-4">
              <h3 className="font-semibold mb-4 text-sm">Live Transcript</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {transcript.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <p>Start the debate by pressing the microphone button.</p>
                    <p className="text-xs mt-2">Speak to engage with the agents.</p>
                  </div>
                ) : (
                  transcript.map((entry, index) => {
                    const config = entry.isUser
                      ? null
                      : agentConfig[entry.speaker] || null;
                    const Icon = config?.icon || User;

                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex gap-3 p-2 rounded-lg transition-all",
                          entry.isUser && "bg-muted/50"
                        )}
                      >
                        {!entry.isUser && config && (
                          <Avatar className={cn("h-8 w-8 shrink-0", config.bgColor)}>
                            <AvatarFallback className="bg-transparent">
                              <Icon className="h-4 w-4 text-white" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {entry.isUser && (
                          <Avatar className="h-8 w-8 shrink-0 bg-primary">
                            <AvatarFallback className="bg-transparent text-primary-foreground">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-medium">{entry.speaker}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={transcriptEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom voice control bar */}
      <div className="border-t border-border p-4 bg-muted/30">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <Button
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "h-16 w-16 rounded-full",
              isRecording && "bg-destructive hover:bg-destructive/90 animate-pulse"
            )}
            disabled={isProcessing}
          >
            {isRecording ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          {isRecording && (
            <div className="ml-4 text-sm text-muted-foreground">
              Recording... Click to stop
            </div>
          )}
          {isProcessing && (
            <div className="ml-4 text-sm text-muted-foreground">
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
