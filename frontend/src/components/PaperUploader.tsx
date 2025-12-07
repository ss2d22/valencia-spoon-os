"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, FileText, X, Loader2, MessageCircle, Mic, Globe } from "lucide-react";
import { startInteractiveSession, startInteractiveSessionPdf } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface PaperUploaderProps {
  isLoading?: boolean;
}

export function PaperUploader({ isLoading: externalLoading }: PaperUploaderProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = isLoading || externalLoading;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      let session;

      if (!textMode && file) {
        session = await startInteractiveSessionPdf(file);
      } else if (textMode && text.trim().length >= 100) {
        session = await startInteractiveSession(text, title || undefined);
      } else {
        throw new Error("Please provide a PDF file or at least 100 characters of text");
      }

      localStorage.setItem("interactiveSession", JSON.stringify(session));
      router.push("/interactive?autostart=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start tribunal");
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          {t.uploader.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t.uploader.subtitle}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={!textMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTextMode(false);
              setText("");
              setTitle("");
              setError(null);
            }}
          >
            {t.uploader.uploadPdf}
          </Button>
          <Button
            variant={textMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTextMode(true);
              setFile(null);
              setError(null);
            }}
          >
            {t.uploader.pasteText}
          </Button>
        </div>

        {!textMode ? (
          <div
            key="pdf-upload"
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 transition-colors",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              file && "border-success bg-success/5"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-success" />
                <div className="text-center">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t.uploader.dropzone}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.uploader.maxSize}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div key="text-input" className="space-y-3">
            <input
              type="text"
              placeholder={t.uploader.titlePlaceholder}
              value={title || ""}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              disabled={loading}
            />
            <textarea
              placeholder={t.uploader.contentPlaceholder}
              value={text || ""}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-48 px-3 py-2 rounded-md border bg-background text-sm resize-none"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {text.length} / 100 {t.uploader.minChars}
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            {error.includes("Language not supported") ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-destructive/20 mb-3">
                  <Globe className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="text-sm font-semibold text-destructive mb-1">
                  {t.language.notSupported}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {t.language.notSupportedDesc}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.language.detected}: <span className="font-medium">{error.split(": ")[1]?.split(".")[0] || "Unknown"}</span>
                </p>
              </div>
            ) : (
              <p className="text-destructive text-sm">{error}</p>
            )}
          </div>
        )}

        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleSubmit}
          disabled={loading || (!file && (!textMode || text.length < 100))}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.uploader.startingTribunal}
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4" />
              {t.uploader.startConversation}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {t.uploader.voiceNote}
        </p>
      </CardContent>
    </Card>
  );
}
