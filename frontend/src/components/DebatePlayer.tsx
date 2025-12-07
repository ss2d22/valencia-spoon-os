"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { DebateRound } from "@/lib/api";

interface DebatePlayerProps {
  audioUrl?: string;
  rounds: DebateRound[];
  onRoundChange?: (round: number) => void;
}

export function DebatePlayer({ audioUrl, rounds, onRoundChange }: DebatePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(audio.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(audio.currentTime - 10, 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Number(e.target.value);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRoundSelect = (index: number) => {
    setCurrentRound(index);
    onRoundChange?.(index);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Debate Recording</span>
          <Badge variant="outline">
            Round {currentRound + 1} of {rounds.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {audioUrl && (
          <>
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-12">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" onClick={skipBackward}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button size="lg" className="h-14 w-14 rounded-full" onClick={togglePlay}>
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={skipForward}>
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            </div>
          </>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Debate Rounds</h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {rounds.map((round, i) => (
              <Button
                key={i}
                variant={currentRound === i ? "default" : "outline"}
                size="sm"
                onClick={() => handleRoundSelect(i)}
                className="shrink-0"
              >
                Round {round.round_number}
              </Button>
            ))}
          </div>
        </div>

        {rounds[currentRound] && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Transcript</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {rounds[currentRound].statements.map((statement, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className={cn(
                      "w-1 rounded-full shrink-0",
                       "bg-muted"
                    )}
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-medium">{statement.agent}</p>
                    <p className="text-sm text-muted-foreground">{statement.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!audioUrl && rounds.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No debate recording available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
