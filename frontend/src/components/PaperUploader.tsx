"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, FileText, X, Loader2 } from "lucide-react";

interface PaperUploaderProps {
  onSubmit: (file: File) => Promise<void>;
  onTextSubmit?: (text: string, title?: string) => Promise<void>;
  isLoading?: boolean;
}

export function PaperUploader({ onSubmit, onTextSubmit, isLoading }: PaperUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");

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
    if (textMode && onTextSubmit && text.trim()) {
      await onTextSubmit(text, title || undefined);
    } else if (file) {
      await onSubmit(file);
    }
  };

  const clearFile = () => {
    setFile(null);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Submit Paper for Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={!textMode ? "default" : "outline"}
            size="sm"
            onClick={() => setTextMode(false)}
          >
            Upload PDF
          </Button>
          <Button
            variant={textMode ? "default" : "outline"}
            size="sm"
            onClick={() => setTextMode(true)}
          >
            Paste Text
          </Button>
        </div>

        {!textMode ? (
          <div
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
              disabled={isLoading}
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
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop your PDF here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Paper title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              disabled={isLoading}
            />
            <textarea
              placeholder="Paste the paper content here... (minimum 100 characters)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-48 px-3 py-2 rounded-md border bg-background text-sm resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {text.length} / 100 minimum characters
            </p>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={isLoading || (!file && (!textMode || text.length < 100))}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Start Tribunal Review
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
