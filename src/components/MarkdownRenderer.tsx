"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Code } from 'lucide-react';

interface MarkdownRendererProps { content: string; }

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none text-sm leading-relaxed text-text-primary">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h2 className="text-xl font-bold text-text-primary mt-4 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h3 className="text-lg font-bold text-text-primary mt-3 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h4 className="text-base font-bold text-text-primary mt-2 mb-1" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 text-text-secondary" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-text-secondary" {...props} />,
          li: ({ node, ...props }) => <li className="ml-2" {...props} />,
          a: ({ node, ...props }) => <a className="text-accent-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const inline = !className;
            if (inline) return <code className="bg-bg-elevated text-accent-blue font-mono px-1.5 py-0.5 rounded-md text-xs" {...props}>{children}</code>;
            return <CodeBlock language={lang} code={String(children).replace(/\n$/, '')} />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  return (
    <div className="my-4 rounded-xl overflow-hidden card-border bg-[#0a0a0f]">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-elevated border-b border-border-default text-xs text-text-muted">
        <div className="flex items-center gap-2"><Code size={13} className="text-accent-blue" /><span className="uppercase text-[10px] tracking-wider">{language || 'code'}</span></div>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer">
          {copied ? <><Check size={12} className="text-accent-success" /><span className="text-accent-success">Copied</span></> : <><Copy size={12} /><span>Copy</span></>}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-xs leading-5 text-text-primary select-text"><pre><code>{code}</code></pre></div>
    </div>
  );
}
