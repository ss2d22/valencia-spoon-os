"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InteractiveTribunal } from "@/components/InteractiveTribunal";
import { startInteractiveSession, startInteractiveSessionPdf, type InteractiveSession } from "@/lib/api";
import { Gavel, ArrowLeft, Loader2, MessageCircle, Upload, FileText, Mic } from "lucide-react";
import Link from "next/link";

function InteractivePageContent() {
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [session, setSession] = useState<InteractiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for autostart session from home page
  useEffect(() => {
    const autostart = searchParams.get("autostart");
    if (autostart === "true") {
      const storedSession = localStorage.getItem("interactiveSession");
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession) as InteractiveSession;
          setSession(sessionData);
          localStorage.removeItem("interactiveSession");
        } catch (e) {
          console.error("Failed to parse stored session:", e);
        }
      }
    }
  }, [searchParams]);

  const handleStartSession = async () => {
    if (text.trim().length < 100) {
      setError("Paper text must be at least 100 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sessionData = await startInteractiveSession(text, title || undefined);
      setSession(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const content = await file.text();
      setText(content);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setIsLoading(true);
      setError(null);
      try {
        const sessionData = await startInteractiveSessionPdf(file);
        setSession(sessionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process PDF");
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("Please upload a .txt or .pdf file");
    }
  };

  if (session) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <Gavel className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold">Live Tribunal</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm text-primary">
                  <Mic className="h-4 w-4 animate-pulse" />
                  <span>Voice Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="pt-20 pb-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <InteractiveTribunal
              sessionId={session.session_id}
              paperTitle={session.paper_title}
              openingStatements={session.opening_statements}
              analyses={session.analyses}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Gavel className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Live Tribunal</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Start a Voice Tribunal</h1>
            <p className="text-muted-foreground">
              Submit a paper and have a natural voice conversation with the AI agents.
              They'll speak their analysis and you can respond with your voice.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submit Paper
              </CardTitle>
              <CardDescription>
                Upload a PDF or paste text. The agents will analyze it and start speaking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload - Primary Action */}
              <div>
                <label className="block">
                  <input
                    type="file"
                    accept=".txt,.pdf,application/pdf,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/50 rounded-xl p-8 cursor-pointer hover:bg-primary/5 transition-colors">
                    <Upload className="h-10 w-10 text-primary" />
                    <div className="text-center">
                      <p className="font-medium text-primary">Upload PDF or TXT file</p>
                      <p className="text-sm text-muted-foreground">
                        Click to browse or drag and drop
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or paste text
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Paper Title (Optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter paper title..."
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Paper Content</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your paper abstract or full text here..."
                  className="w-full h-48 rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {text.length} characters (minimum 100 required)
                </p>
              </div>

              <Button
                onClick={handleStartSession}
                disabled={isLoading || text.trim().length < 100}
                className="w-full gap-2"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Starting Tribunal...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5" />
                    Start Live Conversation
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Mic className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong>Voice-first experience:</strong> Agents will speak their analysis aloud.
                  Tap the microphone to respond with your voice.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Export with Suspense wrapper for useSearchParams
export default function InteractivePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InteractivePageContent />
    </Suspense>
  );
}
