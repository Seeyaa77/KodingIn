"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useKodingku } from '@/context/KodingkuContext';
import Link from 'next/link';
import { isMock, supabase } from '@/lib/supabase';
import { Plus, ArrowUp, ArrowDown, MessageSquare, X, Eye, EyeOff, ShieldAlert, Flame, Clock, HelpCircle, ChevronRight, TrendingUp, Users, FileText, Award, CheckCircle2, Image as ImageIcon, Bold, Italic, Heading, Link as LinkIcon, Code, Braces, Quote, List, BookOpen } from 'lucide-react';
import GithubPreviewCard from '@/components/GithubPreviewCard';
import LiveCodePreview from '@/components/LiveCodePreview';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type SortMode = 'hot' | 'newest' | 'unanswered';

function stripMarkdown(md: string): string {
  if (!md) return "";
  let str = md;
  // Replace images
  str = str.replace(/!\[.*?\]\(.*?\)/g, "");
  // Replace links
  str = str.replace(/\[(.*?)\]\(.*?\)/g, "$1");
  // Replace code blocks and inline code
  str = str.replace(/```[\s\S]*?```/g, "");
  str = str.replace(/`([^`]+)`/g, "$1");
  // Replace headers (#...)
  str = str.replace(/^#+\s+/gm, "");
  // Replace emphasis (bold, italic)
  str = str.replace(/(\*\*|__)(.*?)\1/g, "$2");
  str = str.replace(/(\*|_)(.*?)\1/g, "$2");
  // Replace blockquotes
  str = str.replace(/^\s*>\s+/gm, "");
  // Replace list markers
  str = str.replace(/^\s*[-*+]\s+/gm, "");
  str = str.replace(/^\s*\d+\.\s+/gm, "");
  return str.trim();
}

export default function Home() {
  const { currentUser, users, threads, replies, voteThread, createThread, switchUserProfile, registerUserProfile, activeTagFilter, setActiveTagFilter, searchQuery, logout } = useKodingku();

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newGithub, setNewGithub] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Showcase']);
  const [includeSandbox, setIncludeSandbox] = useState(false);
  const [sandboxHtml, setSandboxHtml] = useState('<h1>Hello Kodingku</h1>');
  const [sandboxCss, setSandboxCss] = useState('h1 { color: #3b82f6; }');
  const [sandboxJs, setSandboxJs] = useState('');
  const [editorTab, setEditorTab] = useState<'write'|'preview'>('write');
  const [sortMode, setSortMode] = useState<SortMode>('hot');
  const [uploading, setUploading] = useState(false);

  // Registration (mock only)
  const [showRegForm, setShowRegForm] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regDisplay, setRegDisplay] = useState('');
  const [regTech, setRegTech] = useState('');

  const [revealedNSFC, setRevealedNSFC] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (syntaxType: 'bold' | 'italic' | 'heading' | 'link' | 'code' | 'codeblock' | 'quote' | 'list') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    switch (syntaxType) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'heading':
        replacement = `\n# ${selectedText || 'Heading'}\n`;
        break;
      case 'link':
        replacement = `[${selectedText || 'link text'}](https://example.com)`;
        break;
      case 'code':
        replacement = `\`${selectedText || 'code'}\``;
        break;
      case 'codeblock':
        replacement = `\n\`\`\`javascript\n${selectedText || '// code block'}\n\`\`\`\n`;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || 'quote'}\n`;
        break;
      case 'list':
        replacement = `\n- ${selectedText || 'list item'}\n`;
        break;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setNewContent(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  useEffect(() => { setReady(true); }, []);

  const handleCreateThreadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const sandbox = includeSandbox ? { html: sandboxHtml, css: sandboxCss, js: sandboxJs } : undefined;
    const success = await createThread(newTitle, newContent, selectedTags, sandbox, newGithub);
    if (success) { setNewTitle(''); setNewContent(''); setNewGithub(''); setIncludeSandbox(false); setShowModal(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (isMock) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setNewContent(prev => prev + `\n\n![Uploaded Image](${dataUrl})`);
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } else {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        setNewContent(prev => prev + `\n\n![Uploaded Image](${publicUrl})`);
        setUploading(false);
      }
    } catch (err: any) {
      alert("Error uploading image: " + err.message);
      setUploading(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regDisplay.trim()) return;
    registerUserProfile(regUsername, regDisplay, regTech.split(',').map(t => t.trim()).filter(Boolean));
    setShowRegForm(false); setRegUsername(''); setRegDisplay(''); setRegTech('');
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) { if (selectedTags.length > 1) setSelectedTags(prev => prev.filter(t => t !== tag)); }
    else setSelectedTags(prev => [...prev, tag]);
  };

  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      const matchesTag = activeTagFilter === 'ALL' || t.tags.some(tag => tag.toUpperCase() === activeTagFilter.toUpperCase());
      const matchesSearch = !searchQuery.trim() || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.author?.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.author?.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTag && matchesSearch;
    });
  }, [threads, activeTagFilter, searchQuery]);

  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (sortMode === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortMode === 'unanswered') {
      const aR = replies.filter(r => r.threadId === a.id).length;
      const bR = replies.filter(r => r.threadId === b.id).length;
      return aR - bR;
    }
    return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
  });

  if (!ready) return (
    <main className="flex-grow flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    </main>
  );

  return (
    <main className="flex-grow flex flex-col max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6 animate-fade-in">

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Feed Column */}
        <div className="lg:col-span-3 space-y-4">

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              {['ALL', 'Tutor', 'Showcase', 'Meme', 'Ask', 'Bug'].map((tag) => (
                <button key={tag} onClick={() => setActiveTagFilter(tag)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    activeTagFilter === tag ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-muted hover:text-text-primary hover:bg-hover-bg'
                  }`}>
                  {tag === 'ALL' ? 'All' : `#${tag}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="flex items-center bg-bg-card card-border rounded-lg overflow-hidden text-xs">
                {([['hot','Flame'],['newest','Clock'],['unanswered','HelpCircle']] as [SortMode,string][]).map(([mode]) => (
                  <button key={mode} onClick={() => setSortMode(mode)}
                    className={`px-3 py-1.5 capitalize transition-colors cursor-pointer ${sortMode === mode ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-muted hover:text-text-primary'}`}>
                    {mode}
                  </button>
                ))}
              </div>
              {currentUser && (
                <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer">
                  <Plus size={14} /> New Post
                </button>
              )}
            </div>
          </div>

          {/* Thread List */}
          <div className="space-y-3">
            {sortedThreads.length === 0 ? (
              <div className="p-12 card-border rounded-xl text-center text-text-muted text-sm">No threads found for this filter.</div>
            ) : (
              sortedThreads.map((thread) => {
                const isNSFC = thread.tags.some(t => t.toLowerCase() === 'nsfc');
                const showNSFC = revealedNSFC[thread.id] || false;
                const replyCount = replies.filter(r => r.threadId === thread.id).length;
                const cleanPreview = stripMarkdown(thread.content);

                return (
                  <article key={thread.id} className="p-4 bg-bg-card card-border rounded-xl card-hover flex gap-4">
                    {/* Vote */}
                    <div className="flex flex-col items-center gap-0.5 pt-1">
                      <button onClick={() => voteThread(thread.id, 'up')} disabled={!currentUser}
                        className={`vote-btn p-1 rounded-md hover:bg-hover-bg ${!currentUser ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} text-text-muted hover:text-accent-success`}>
                        <ArrowUp size={16} />
                      </button>
                      <span className="text-xs font-semibold text-text-primary py-0.5">{thread.upvotes - thread.downvotes}</span>
                      <button onClick={() => voteThread(thread.id, 'down')} disabled={!currentUser}
                        className={`vote-btn p-1 rounded-md hover:bg-hover-bg ${!currentUser ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} text-text-muted hover:text-accent-danger`}>
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 text-xs text-text-muted mb-1.5 flex-wrap">
                        <span className="font-medium text-text-secondary">{thread.author?.displayName}</span>
                        <span>@{thread.author?.username}</span>
                        <span className="text-text-muted">·</span>
                        <span>{new Date(thread.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>

                      <Link href={`/thread/${thread.id}`} className="block group">
                        <h2 className="text-sm font-semibold text-text-primary group-hover:text-accent-blue transition-colors mb-1.5 line-clamp-1 flex items-center gap-2 flex-wrap">
                          <span>{thread.title}</span>
                          {thread.solvedReplyId && (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-accent-success/15 text-accent-success px-1.5 py-0.5 rounded uppercase tracking-wider">
                              <CheckCircle2 size={8} /> Solved
                            </span>
                          )}
                          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-accent-blue inline-block" />
                        </h2>
                      </Link>

                      {isNSFC && !showNSFC ? (
                        <div className="my-2 p-4 border border-accent-danger/20 bg-accent-danger/5 rounded-lg text-center">
                          <ShieldAlert size={18} className="text-accent-danger mx-auto mb-2" />
                          <p className="text-xs text-accent-danger font-medium">NSFC Content</p>
                          <button onClick={() => setRevealedNSFC(p => ({...p, [thread.id]: true}))}
                            className="mt-2 text-xs text-accent-danger/80 hover:text-accent-danger underline cursor-pointer">Reveal</button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-text-muted line-clamp-2 mb-2 leading-relaxed">
                            {cleanPreview.length > 200 ? `${cleanPreview.substring(0, 200)}...` : cleanPreview}
                          </p>
                          {thread.githubUrl && <div onClick={(e) => e.stopPropagation()}><GithubPreviewCard url={thread.githubUrl} /></div>}
                          {thread.codePreview && <div onClick={(e) => e.stopPropagation()} className="max-w-xl"><LiveCodePreview initialHtml={thread.codePreview.html} initialCss={thread.codePreview.css} initialJs={thread.codePreview.js} editable={false} /></div>}
                          {isNSFC && showNSFC && (
                            <button onClick={() => setRevealedNSFC(p => ({...p, [thread.id]: false}))} className="text-[10px] text-accent-danger hover:underline cursor-pointer flex items-center gap-1 mt-1">
                              <EyeOff size={10} /> Hide
                            </button>
                          )}
                        </>
                      )}

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border-default">
                        <div className="flex items-center gap-1.5">
                          {thread.tags.map(t => (
                            <span key={t} className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              t.toLowerCase() === 'nsfc' ? 'bg-accent-danger/10 text-accent-danger'
                              : t.toLowerCase() === 'tutor' ? 'bg-accent-success/10 text-accent-success'
                              : 'bg-accent-blue/10 text-accent-blue'
                            }`}>#{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          {currentUser?.role === 'admin' && (
                            <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (confirm("Delete this thread?")) { await supabase.from('threads').delete().eq('id', thread.id); } }}
                              className="text-[10px] text-accent-danger hover:underline cursor-pointer">Delete</button>
                          )}
                          <Link href={`/thread/${thread.id}`} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
                            <MessageSquare size={12} /> {replyCount}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 text-sm">
          <section className="p-4 bg-bg-card card-border rounded-xl">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingUp size={13} /> Stats</h3>
            <div className="space-y-2.5 text-xs text-text-muted">
              <div className="flex justify-between"><span>Members</span><span className="text-text-primary font-medium">{users.length}</span></div>
              <div className="flex justify-between"><span>Threads</span><span className="text-text-primary font-medium">{threads.length}</span></div>
              <div className="flex justify-between"><span>Replies</span><span className="text-text-primary font-medium">{replies.length}</span></div>
            </div>
          </section>

          <section className="p-4 bg-bg-card card-border rounded-xl">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5"><Award size={13} /> Leaderboard</h3>
            <div className="space-y-2.5">
              {[...users].sort((a, b) => b.reputation - a.reputation).slice(0, 5).map((u, i) => (
                <div key={u.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted w-4">{i + 1}.</span>
                    <Link href={`/profile/${u.username}`} className="text-text-primary hover:text-accent-blue transition-colors font-medium">@{u.username}</Link>
                  </div>
                  <span className="text-text-muted">{u.reputation} pts</span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-4 bg-bg-card card-border rounded-xl">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">About</h3>
            <div className="text-xs text-text-muted space-y-2 leading-relaxed">
              <p>Kodingku supports Markdown in threads. Tutorial posts tagged <span className="text-accent-success font-medium">#Tutor</span> earn <span className="text-accent-success font-medium">+15 pts</span>.</p>
              <p>Upvotes grant <span className="text-accent-success font-medium">+10 pts</span>, downvotes subtract <span className="text-accent-danger font-medium">-2 pts</span>.</p>
            </div>
          </section>
        </aside>
      </div>

      {/* Create Thread Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-bg-card card-border rounded-xl p-6 flex flex-col max-h-[90vh] shadow-2xl" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-text-primary">New Thread</h2>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateThreadSubmit} className="flex-grow flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-grow py-2">
                {/* Left Column: Editor */}
                <div className={`${editorTab === 'write' ? 'block' : 'hidden'} md:block space-y-4 flex flex-col`}>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Title</label>
                    <input type="text" required placeholder="What's on your mind?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-bg-app border border-border-default p-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                      <label className="block text-xs text-text-muted">Content (Markdown supported)</label>
                      <div className="flex items-center gap-2">
                        {/* Tab Toggle - only visible on mobile */}
                        <div className="flex items-center gap-1.5 md:hidden">
                          <button type="button" onClick={() => setEditorTab('write')} className={`text-xs px-2 py-1 rounded-md cursor-pointer ${editorTab === 'write' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-muted hover:text-text-primary'}`}>Write</button>
                          <button type="button" onClick={() => setEditorTab('preview')} className={`text-xs px-2 py-1 rounded-md cursor-pointer ${editorTab === 'preview' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-muted hover:text-text-primary'}`}>Preview</button>
                        </div>
                        {editorTab === 'write' && (
                          <label className="text-xs text-text-muted hover:text-accent-blue cursor-pointer flex items-center gap-1 bg-bg-app border border-border-default px-2.5 py-1 rounded-lg transition-colors select-none">
                            <ImageIcon size={12} className={uploading ? 'animate-pulse' : ''} />
                            <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                          </label>
                        )}
                        <button type="button" onClick={() => setShowGuide(!showGuide)} className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors cursor-pointer ${showGuide ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/20' : 'bg-bg-app border-border-default text-text-muted hover:text-text-primary'}`}>
                          <BookOpen size={12} />
                          <span>Cheat Sheet</span>
                        </button>
                      </div>
                    </div>

                    {/* Markdown Formatting Toolbar */}
                    <div className="flex items-center gap-1 p-1.5 bg-bg-app border border-b-0 border-border-default rounded-t-lg flex-wrap">
                      <button type="button" onClick={() => insertMarkdown('bold')} title="Bold (**bold**)" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded transition-colors cursor-pointer"><Bold size={13} /></button>
                      <button type="button" onClick={() => insertMarkdown('italic')} title="Italic (*italic*)" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded transition-colors cursor-pointer"><Italic size={13} /></button>
                      <button type="button" onClick={() => insertMarkdown('heading')} title="Heading (# Heading)" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded transition-colors cursor-pointer"><Heading size={13} /></button>
                      <button type="button" onClick={() => insertMarkdown('link')} title="Link ([text](url))" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded transition-colors cursor-pointer"><LinkIcon size={13} /></button>
                      <button type="button" onClick={() => insertMarkdown('code')} title="Inline Code (`code`)" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded transition-colors cursor-pointer"><Code size={13} /></button>
                      <button type="button" onClick={() => insertMarkdown('codeblock')} title="Code Block (```js ... ```)" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded transition-colors cursor-pointer"><Braces size={13} /></button>
                      <button type="button" onClick={() => insertMarkdown('quote')} title="Blockquote (> quote)" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded transition-colors cursor-pointer"><Quote size={13} /></button>
                      <button type="button" onClick={() => insertMarkdown('list')} title="Bullet List (- item)" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover-bg rounded transition-colors cursor-pointer"><List size={13} /></button>
                    </div>

                    <textarea ref={textareaRef} required placeholder="Write your content (Markdown supported)..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={7}
                      className="w-full bg-bg-app border border-border-default p-2.5 rounded-b-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue font-mono text-xs resize-y" />

                    {showGuide && (
                      <div className="mt-2 p-3 bg-bg-app border border-border-default rounded-lg text-[10px] font-mono text-text-muted grid grid-cols-2 gap-x-4 gap-y-1.5 animate-fade-in">
                        <div><span className="text-accent-blue font-medium">**bold**</span>: Bold text</div>
                        <div><span className="text-accent-blue font-medium">*italic*</span>: Italic text</div>
                        <div><span className="text-accent-blue font-medium"># Title</span>: Heading 1</div>
                        <div><span className="text-accent-blue font-medium">[text](url)</span>: Link</div>
                        <div><span className="text-accent-blue font-medium">`code`</span>: Inline Code</div>
                        <div><span className="text-accent-blue font-medium">```lang ... ```</span>: Code block</div>
                        <div><span className="text-accent-blue font-medium">&gt; quote</span>: Blockquote</div>
                        <div><span className="text-accent-blue font-medium">- item</span>: List item</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">GitHub Link (optional)</label>
                    <input type="url" placeholder="https://github.com/owner/repo" value={newGithub} onChange={(e) => setNewGithub(e.target.value)}
                      className="w-full bg-bg-app border border-border-default p-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
                  </div>

                  <div>
                    <span className="block text-xs text-text-muted mb-1.5">Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {['Tutor', 'Showcase', 'Meme', 'Ask', 'Bug', 'NSFC'].map((tag) => (
                        <button type="button" key={tag} onClick={() => handleTagToggle(tag)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                            selectedTags.includes(tag) ? 'bg-accent-blue/10 text-accent-blue font-medium border border-accent-blue/20' : 'bg-bg-app border border-border-default text-text-muted hover:text-text-primary'
                          }`}>#{tag}</button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-border-default rounded-lg p-3 bg-bg-app/40">
                    <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer select-none">
                      <input type="checkbox" checked={includeSandbox} onChange={(e) => setIncludeSandbox(e.target.checked)} className="accent-accent-blue rounded" />
                      Include Code Playground
                    </label>
                    {includeSandbox && (
                      <div className="grid grid-cols-3 gap-2 pt-3 text-[10px]">
                        {[['HTML', sandboxHtml, setSandboxHtml], ['CSS', sandboxCss, setSandboxCss], ['JS', sandboxJs, setSandboxJs]].map(([label, val, setter]: any) => (
                          <div key={label}>
                            <span className="text-text-muted uppercase font-medium">{label}</span>
                            <textarea value={val} onChange={(e: any) => setter(e.target.value)} rows={3}
                              className="w-full bg-bg-app border border-border-default p-1.5 rounded-lg font-mono text-[10px] focus:outline-none focus:border-accent-blue mt-1" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Preview (updates instantly) */}
                <div className={`${editorTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-col border-l border-border-default md:pl-6 h-full min-h-[400px] overflow-hidden`}>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <span className="block text-xs text-text-muted font-medium uppercase tracking-wider">Live Preview</span>
                    {/* Tab Toggle - only visible on mobile */}
                    <div className="flex items-center gap-1.5 md:hidden">
                      <button type="button" onClick={() => setEditorTab('write')} className={`text-xs px-2 py-1 rounded-md cursor-pointer ${editorTab === 'write' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-muted hover:text-text-primary'}`}>Write</button>
                      <button type="button" onClick={() => setEditorTab('preview')} className={`text-xs px-2 py-1 rounded-md cursor-pointer ${editorTab === 'preview' ? 'bg-accent-blue/10 text-accent-blue font-medium' : 'text-text-muted hover:text-text-primary'}`}>Preview</button>
                    </div>
                  </div>
                  <div className="flex-grow bg-bg-app border border-border-default rounded-lg p-4 overflow-y-auto max-h-[500px]">
                    {newTitle && <h1 className="text-sm font-bold text-text-primary mb-3 border-b border-border-default pb-2">{newTitle}</h1>}
                    {newContent ? (
                      <div className="prose prose-invert max-w-none text-xs">
                        <MarkdownRenderer content={newContent} />
                      </div>
                    ) : (
                      <span className="text-text-muted italic text-xs">Nothing to preview yet...</span>
                    )}

                    {includeSandbox && (
                      <div className="mt-6 border-t border-border-default pt-4">
                        <span className="block text-[10px] text-text-muted uppercase font-semibold mb-2">Sandbox Output</span>
                        <div className="h-44 rounded-lg overflow-hidden border border-border-default bg-white">
                          <iframe srcDoc={`<!DOCTYPE html><html><head><style>${sandboxCss}</style></head><body>${sandboxHtml}<script>${sandboxJs}</script></body></html>`}
                            title="Live Code Sandbox Output" className="w-full h-full border-0" sandbox="allow-scripts" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-border-default flex justify-end gap-3 mt-4 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
