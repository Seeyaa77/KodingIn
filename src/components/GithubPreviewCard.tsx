"use client";

import React, { useState, useEffect } from 'react';
import { Star, GitFork } from 'lucide-react';

interface GithubRepoData { owner: string; repo: string; description: string; stars: number; forks: number; language: string; url: string; }
interface GithubPreviewCardProps { url: string; }

const mockRepoMetadata: Record<string, Omit<GithubRepoData, 'url'>> = {
  "jesseduffield/lazygit": { owner: "jesseduffield", repo: "lazygit", description: "simple terminal UI for git commands, written in Go", stars: 43200, forks: 1720, language: "Go" },
  "facebook/react": { owner: "facebook", repo: "react", description: "The library for web and native user interfaces.", stars: 221000, forks: 46200, language: "JavaScript" },
  "vercel/next.js": { owner: "vercel", repo: "next.js", description: "The React Framework", stars: 120500, forks: 26800, language: "TypeScript" },
  "supabase/supabase": { owner: "supabase", repo: "supabase", description: "The open source Firebase alternative.", stars: 65400, forks: 4900, language: "TypeScript" }
};

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function GithubPreviewCard({ url }: GithubPreviewCardProps) {
  const [data, setData] = useState<GithubRepoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchMetadata = async () => {
      setLoading(true);
      let repoKey = "";
      const match = url.match(/github\.com\/([^/]+)\/([^/&#?]+)/);
      if (match) repoKey = `${match[1]}/${match[2].replace('.git', '')}`.toLowerCase();

      try {
        const res = await fetch(`http://localhost:3001/api/scrape-github?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.message);
        if (active) { setData(json); setLoading(false); }
      } catch {
        const matchedMock = Object.keys(mockRepoMetadata).find(k => k.toLowerCase() === repoKey);
        if (matchedMock && active) { setData({ ...mockRepoMetadata[matchedMock], url }); setLoading(false); }
        else if (active) { const [owner, repo] = repoKey.split('/'); setData({ owner: owner || "github", repo: repo || "repo", description: "GitHub repository", stars: 0, forks: 0, language: "Code", url }); setLoading(false); }
      }
    };
    fetchMetadata();
    return () => { active = false; };
  }, [url]);

  if (loading) return <div className="my-3 p-4 card-border rounded-xl bg-bg-elevated skeleton-pulse h-20" />;
  if (!data) return null;

  const getLangColor = (lang: string) => {
    const colors: Record<string, string> = { typescript: 'bg-[#3178c6]', javascript: 'bg-[#f1e05a]', go: 'bg-[#00add8]', python: 'bg-[#3572a5]', html: 'bg-[#e34c26]', css: 'bg-[#563d7c]' };
    return colors[lang.toLowerCase()] || 'bg-accent-blue';
  };

  return (
    <a href={data.url} target="_blank" rel="noopener noreferrer" className="block my-3 p-4 card-border rounded-xl bg-bg-card card-hover group">
      <div className="flex items-center gap-2 mb-2">
        <GithubIcon className="text-text-muted group-hover:text-accent-blue transition-colors" />
        <span className="text-sm font-medium text-accent-blue">{data.owner}/{data.repo}</span>
      </div>
      <p className="text-xs text-text-muted line-clamp-2 mb-3">{data.description}</p>
      <div className="flex items-center gap-4 text-xs text-text-muted">
        {data.language && <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${getLangColor(data.language)}`} />{data.language}</div>}
        <div className="flex items-center gap-1"><Star size={12} className="text-accent-warning" />{data.stars.toLocaleString()}</div>
        <div className="flex items-center gap-1"><GitFork size={12} />{data.forks.toLocaleString()}</div>
      </div>
    </a>
  );
}
