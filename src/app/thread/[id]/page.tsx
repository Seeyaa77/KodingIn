"use client";

import React, { use, useState } from 'react';
import { useKodingku } from '@/context/KodingkuContext';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import LiveCodePreview from '@/components/LiveCodePreview';
import GithubPreviewCard from '@/components/GithubPreviewCard';
import ReplyTree from '@/components/ReplyTree';
import { isMock, supabase } from '@/lib/supabase';

interface ThreadPageProps { params: Promise<{ id: string }>; }

export default function ThreadDetail({ params }: ThreadPageProps) {
  const { id } = use(params);
  const { currentUser, threads, replies, voteThread, createReply } = useKodingku();
  const [revealedNSFC, setRevealedNSFC] = useState(false);

  const thread = threads.find(t => t.id === id);
  const threadReplies = replies.filter(r => r.threadId === id);

  if (!thread) {
    return (
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-bg-card card-border p-6 rounded-xl text-center">
          <AlertCircle size={24} className="text-accent-danger mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-text-primary mb-1">Thread Not Found</h2>
          <p className="text-xs text-text-muted mb-4">This thread may have been deleted.</p>
          <Link href="/" className="text-xs text-accent-blue hover:underline">← Back to feed</Link>
        </div>
      </div>
    );
  }

  const isNSFC = thread.tags.some(t => t.toLowerCase() === 'nsfc');

  return (
    <div className="flex-grow flex flex-col max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <Link href="/" className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-blue transition-colors text-xs w-fit">
        <ArrowLeft size={14} /> Back to feed
      </Link>

      <article className="p-5 bg-bg-card card-border rounded-xl">
        <div className="flex gap-4 items-start">
          {/* Vote */}
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <button onClick={() => voteThread(thread.id, 'up')} disabled={!currentUser}
              className={`vote-btn p-1.5 rounded-lg hover:bg-hover-bg ${!currentUser ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} text-text-muted hover:text-accent-success`}>
              <ArrowUp size={18} />
            </button>
            <span className="text-sm font-bold text-text-primary py-0.5">{thread.upvotes - thread.downvotes}</span>
            <button onClick={() => voteThread(thread.id, 'down')} disabled={!currentUser}
              className={`vote-btn p-1.5 rounded-lg hover:bg-hover-bg ${!currentUser ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} text-text-muted hover:text-accent-danger`}>
              <ArrowDown size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-grow min-w-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border-default pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <Link href={`/profile/${thread.author?.username}`} className="font-semibold text-text-primary hover:text-accent-blue transition-colors">{thread.author?.displayName}</Link>
                <span className="text-text-muted">@{thread.author?.username}</span>
                <span className="text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded-md text-[10px]">{thread.author?.reputation} pts</span>
              </div>
              <div className="flex items-center gap-3">
                {currentUser?.role === 'admin' && (
                  <button onClick={async () => { if (confirm("Delete this thread?")) { const { error } = await supabase.from('threads').delete().eq('id', thread.id); if (!error) window.location.href = '/'; } }}
                    className="text-[10px] text-accent-danger hover:underline cursor-pointer">Delete thread</button>
                )}
                <span className="text-xs text-text-muted">
                  {new Date(thread.createdAt).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <h1 className="text-lg font-bold text-text-primary mb-3">{thread.title}</h1>

            {/* Tags */}
            <div className="flex items-center gap-1.5 mb-4">
              {thread.tags.map(t => (
                <span key={t} className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                  t.toLowerCase() === 'nsfc' ? 'bg-accent-danger/10 text-accent-danger'
                  : t.toLowerCase() === 'tutor' ? 'bg-accent-success/10 text-accent-success'
                  : 'bg-accent-blue/10 text-accent-blue'
                }`}>#{t}</span>
              ))}
            </div>

            {/* NSFC Gate */}
            {isNSFC && !revealedNSFC ? (
              <div className="p-6 border border-accent-danger/20 bg-accent-danger/5 rounded-xl text-center">
                <AlertCircle size={20} className="text-accent-danger mx-auto mb-2" />
                <p className="text-xs text-accent-danger font-medium mb-1">NSFC Content</p>
                <p className="text-[11px] text-text-muted mb-3 max-w-md mx-auto">This post may contain spaghetti code or unhandled exceptions.</p>
                <button onClick={() => setRevealedNSFC(true)} className="text-xs bg-accent-danger/10 text-accent-danger px-4 py-1.5 rounded-lg hover:bg-accent-danger/20 transition-colors cursor-pointer font-medium">
                  Reveal Content
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <MarkdownRenderer content={thread.content} />
                {thread.githubUrl && <GithubPreviewCard url={thread.githubUrl} />}
                {thread.codePreview && (
                  <div className="mt-4">
                    <p className="text-xs text-text-muted mb-2 font-medium">Code Playground</p>
                    <LiveCodePreview initialHtml={thread.codePreview.html} initialCss={thread.codePreview.css} initialJs={thread.codePreview.js} editable={true} />
                  </div>
                )}
                {isNSFC && revealedNSFC && (
                  <button onClick={() => setRevealedNSFC(false)} className="text-[10px] text-accent-danger hover:underline cursor-pointer">Hide content</button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      <ReplyTree replies={threadReplies} currentUser={currentUser} onAddReply={(parentId, content) => createReply(id, parentId, content)} />
    </div>
  );
}
