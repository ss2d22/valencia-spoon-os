"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
      await onTextSubmit(text);
    } else if (file) {
      await onSubmit(file);
    }
  };

  const clearFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={!textMode ? "default" : "outline"}
          size="sm"
          onClick={() => setTextMode(false)}
          disabled={isLoading}
        >
          Upload PDF
        </Button>
        {onTextSubmit && (
          <Button
            variant={textMode ? "default" : "outline"}
            size="sm"
            onClick={() => setTextMode(true)}
            disabled={isLoading}
          >
            Paste Text
          </Button>
        )}
      </div>

      {!textMode ? (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-12 transition-all cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-slate-700 hover:border-slate-600",
            file && "border-primary bg-primary/10"
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
            <div className="flex flex-col items-center justify-center gap-3">
              <FileText className="h-12 w-12 text-primary" />
              <div className="text-center">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                Drag and drop your PDF here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse files
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            placeholder="Paste the paper content here... (minimum 100 characters)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-48 px-3 py-2 rounded-md border border-slate-700 bg-background/50 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            Start Tribunal Review
            <FileText className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
