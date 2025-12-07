"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  if (!children) return null;

  return (
    <span className={className}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <span>{children}</span>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-muted font-mono text-sm">
              {children}
            </code>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside my-2">{children}</ol>,
          li: ({ children }) => <li className="ml-2">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </span>
  );
}

export function formatMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  return <Markdown>{text}</Markdown>;
}
