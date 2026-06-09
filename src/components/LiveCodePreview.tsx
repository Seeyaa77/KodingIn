"use client";

import React, { useState, useEffect } from 'react';
import { Code, Eye, RefreshCw } from 'lucide-react';

interface LiveCodePreviewProps {
  initialHtml?: string;
  initialCss?: string;
  initialJs?: string;
  editable?: boolean;
}

export default function LiveCodePreview({ initialHtml = '', initialCss = '', initialJs = '', editable = true }: LiveCodePreviewProps) {
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [js, setJs] = useState(initialJs);
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js' | 'preview'>('preview');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const updatePreview = () => {
    setIsLoading(true);
    setSrcDoc(`<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>window.onerror=function(m){const d=document.createElement('div');d.style.cssText='color:#ef4444;background:#111218;border:1px solid rgba(239,68,68,0.2);padding:8px;font-family:monospace;font-size:12px;margin-top:12px;border-radius:8px';d.innerText='Error: '+m;document.body.appendChild(d);return false};try{${js}}catch(e){window.onerror(e.message)}<\/script></body></html>`);
    setTimeout(() => setIsLoading(false), 300);
  };

  useEffect(() => { updatePreview(); }, [html, css, js]);

  return (
    <div className="my-4 card-border rounded-xl overflow-hidden bg-bg-card flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-bg-elevated border-b border-border-default">
        <div className="flex items-center gap-2">
          <Code size={13} className="text-accent-blue" />
          <span className="text-xs font-medium text-text-secondary">Playground</span>
          <div className="flex items-center bg-bg-app rounded-lg overflow-hidden text-xs ml-2">
            {editable && ['html', 'css', 'js'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)}
                className={`px-2.5 py-1 transition-colors cursor-pointer uppercase text-[10px] ${activeTab === tab ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-muted hover:text-text-primary'}`}>
                {tab}
              </button>
            ))}
            <button onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 flex items-center gap-1 transition-colors cursor-pointer text-[10px] ${activeTab === 'preview' ? 'bg-accent-success/10 text-accent-success font-medium' : 'text-text-muted hover:text-text-primary'}`}>
              <Eye size={11} /> Preview
            </button>
          </div>
        </div>
        <button onClick={updatePreview} className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover-bg transition-colors cursor-pointer text-[10px]">
          <RefreshCw size={11} className={isLoading ? "animate-spin text-accent-success" : ""} /> Run
        </button>
      </div>

      <div className="relative min-h-[200px] flex flex-col bg-[#0a0a0f]">
        {activeTab === 'html' && <textarea value={html} onChange={(e) => setHtml(e.target.value)} className="w-full flex-grow p-3 bg-transparent text-text-primary font-mono text-xs focus:outline-none resize-y min-h-[200px]" placeholder="<!-- HTML -->" />}
        {activeTab === 'css' && <textarea value={css} onChange={(e) => setCss(e.target.value)} className="w-full flex-grow p-3 bg-transparent text-text-primary font-mono text-xs focus:outline-none resize-y min-h-[200px]" placeholder="/* CSS */" />}
        {activeTab === 'js' && <textarea value={js} onChange={(e) => setJs(e.target.value)} className="w-full flex-grow p-3 bg-transparent text-text-primary font-mono text-xs focus:outline-none resize-y min-h-[200px]" placeholder="// JavaScript" />}
        {activeTab === 'preview' && (
          <div className="relative w-full flex-grow min-h-[200px] bg-white rounded-b-xl overflow-hidden">
            {isLoading && <div className="absolute inset-0 bg-bg-app/80 flex items-center justify-center z-10"><div className="w-5 h-5 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" /></div>}
            <iframe srcDoc={srcDoc} title="Live Preview" sandbox="allow-scripts" className="w-full h-full min-h-[220px] bg-transparent border-0" />
          </div>
        )}
      </div>
    </div>
  );
}
