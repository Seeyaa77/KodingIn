"use client";

import React, { use, useState, useMemo } from 'react';
import { useKodingin } from '@/context/KodinginContext';
import Link from 'next/link';
import { ArrowLeft, Trash2, Plus, MessageSquare, ArrowUp, ArrowDown, AlertCircle, Shield, ExternalLink, Pencil, Check, X } from 'lucide-react';
import { supabase, isMock } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

interface ProfilePageProps { params: Promise<{ username: string }>; }

export default function ProfileDetail({ params }: ProfilePageProps) {
  const { username } = use(params);
  const router = useRouter();
  const { 
    currentUser, 
    users, 
    threads, 
    replies, 
    voteThread,
    follows,
    followUser,
    unfollowUser,
    sendMessage,
    conversationParticipants
  } = useKodingin();
  const [newBadge, setNewBadge] = useState('');
  const [editingSocials, setEditingSocials] = useState(false);
  const [socialGithub, setSocialGithub] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');

  // Edit Profile modal states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [avatarOption, setAvatarOption] = useState('generator'); // 'generator' | 'upload' | 'url'
  const [dicebearStyle, setDicebearStyle] = useState('bottts');
  const [dicebearSeed, setDicebearSeed] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openEditModal = () => {
    if (!profileUser) return;
    setEditDisplayName(profileUser.displayName);
    setEditAvatarUrl(profileUser.avatarUrl);
    
    // Parse avatar URL to guess which option to select
    const url = profileUser.avatarUrl || '';
    if (url.includes('api.dicebear.com')) {
      setAvatarOption('generator');
      const match = url.match(/api\.dicebear\.com\/7\.x\/([^/]+)\/svg\?seed=([^&]+)/);
      if (match) {
        setDicebearStyle(match[1]);
        setDicebearSeed(decodeURIComponent(match[2]));
      } else {
        setDicebearStyle('bottts');
        setDicebearSeed(profileUser.username);
      }
    } else if (url.startsWith('data:image/')) {
      setAvatarOption('upload');
    } else {
      setAvatarOption('url');
    }
    setUploadError('');
    setShowEditProfileModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size should be less than 2MB');
      return;
    }
    setUploadError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profileUser || !editDisplayName.trim()) return;
    setIsSaving(true);

    let finalAvatarUrl = editAvatarUrl;
    if (avatarOption === 'generator') {
      finalAvatarUrl = `https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(dicebearSeed)}`;
    }

    try {
      const updates = isMock ? {
        avatarUrl: finalAvatarUrl,
        displayName: editDisplayName.trim()
      } : {
        avatar_url: finalAvatarUrl,
        display_name: editDisplayName.trim()
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profileUser.id);

      if (error) throw error;

      if (!isMock) {
        await supabase.auth.updateUser({
          data: {
            avatar_url: finalAvatarUrl,
            display_name: editDisplayName.trim()
          }
        });
      }

      setShowEditProfileModal(false);
    } catch (err) {
      console.error("Error saving profile details:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessageClick = async () => {
    if (!currentUser || !profileUser) return;
    const userConvs = conversationParticipants.filter(p => p.userId === currentUser.id).map(p => p.conversationId);
    const targetConvs = conversationParticipants.filter(p => p.userId === profileUser.id).map(p => p.conversationId);
    const sharedConvId = userConvs.find(id => targetConvs.includes(id));
    if (!sharedConvId) {
      await sendMessage(profileUser.id, "Initialized secure connection packet.");
    }
    router.push(`/inbox?select=${profileUser.id}`);
  };

  const profileUser = users.find(u => u.username.toLowerCase() === decodeURIComponent(username).toLowerCase());

  const userThreads = useMemo(() => {
    return profileUser ? threads.filter(t => t.userId === profileUser.id) : [];
  }, [threads, profileUser]);

  const userReplies = useMemo(() => {
    return profileUser ? replies.filter(r => r.userId === profileUser.id) : [];
  }, [replies, profileUser]);

  const isOwnProfile = currentUser?.id === profileUser?.id;
  const isAdmin = (profileUser as any)?.role === 'admin';

  const followerCount = useMemo(() => {
    if (!profileUser) return 0;
    return follows.filter(f => f.followingId === profileUser.id).length;
  }, [follows, profileUser]);

  const followingCount = useMemo(() => {
    if (!profileUser) return 0;
    return follows.filter(f => f.followerId === profileUser.id).length;
  }, [follows, profileUser]);

  const isFollowing = useMemo(() => {
    if (!currentUser || !profileUser) return false;
    return follows.some(f => f.followerId === currentUser.id && f.followingId === profileUser.id);
  }, [follows, currentUser, profileUser]);

  const isMutual = useMemo(() => {
    if (!currentUser || !profileUser) return false;
    const followsTarget = follows.some(f => f.followerId === currentUser.id && f.followingId === profileUser.id);
    const followedByTarget = follows.some(f => f.followerId === profileUser.id && f.followingId === currentUser.id);
    return followsTarget && followedByTarget;
  }, [follows, currentUser, profileUser]);

  // Build real activity grid from threads + replies (last 91 days)
  const contribData = useMemo(() => {
    const now = new Date();
    const data: number[] = [];
    for (let i = 90; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      let count = 0;
      count += userThreads.filter(t => t.createdAt.slice(0, 10) === dayStr).length;
      count += userReplies.filter(r => r.createdAt.slice(0, 10) === dayStr).length;
      data.push(count);
    }
    return data;
  }, [userThreads, userReplies]);

  if (!profileUser) {
    return (
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-bg-card card-border p-6 rounded-xl text-center">
          <AlertCircle size={24} className="text-accent-danger mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-text-primary mb-1">Profile Not Found</h2>
          <p className="text-xs text-text-muted mb-4">User <span className="text-accent-blue">@{username}</span> doesn&apos;t exist.</p>
          <Link href="/" className="text-xs text-accent-blue hover:underline">← Back to feed</Link>
        </div>
      </div>
    );
  }

  const getContribColor = (val: number) => {
    if (val === 0) return 'bg-bg-elevated';
    if (val === 1) return 'bg-accent-success/25';
    if (val === 2) return 'bg-accent-success/45';
    if (val === 3) return 'bg-accent-success/65';
    return 'bg-accent-success/85';
  };

  const handleAddBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBadge.trim() || profileUser.techStack.map(t => t.toLowerCase()).includes(newBadge.trim().toLowerCase())) { setNewBadge(''); return; }
    const updatedStack = [...profileUser.techStack, newBadge.trim()];
    if (isMock) supabase.from('users').update({ techStack: updatedStack }).eq('id', profileUser.id);
    else supabase.from('users').update({ tech_stack: updatedStack }).eq('id', profileUser.id);
    setNewBadge('');
  };

  const handleRemoveBadge = (badge: string) => {
    const updatedStack = profileUser.techStack.filter(b => b !== badge);
    if (isMock) supabase.from('users').update({ techStack: updatedStack }).eq('id', profileUser.id);
    else supabase.from('users').update({ tech_stack: updatedStack }).eq('id', profileUser.id);
  };

  const startEditSocials = () => {
    const links = profileUser.socialLinks || {};
    setSocialGithub(links.github || '');
    setSocialInstagram(links.instagram || '');
    setSocialTiktok(links.tiktok || '');
    setSocialLinkedin(links.linkedin || '');
    setEditingSocials(true);
  };

  const saveSocials = () => {
    const socialLinks = {
      github: socialGithub.trim() || undefined,
      instagram: socialInstagram.trim() || undefined,
      tiktok: socialTiktok.trim() || undefined,
      linkedin: socialLinkedin.trim() || undefined,
    };
    if (isMock) supabase.from('users').update({ socialLinks }).eq('id', profileUser.id);
    else supabase.from('users').update({ social_links: socialLinks }).eq('id', profileUser.id);
    setEditingSocials(false);
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'Kernel Archmage': return 'bg-accent-danger/10 text-accent-danger border-accent-danger/20';
      case 'State Wizard': return 'bg-accent-warning/10 text-accent-warning border-accent-warning/20';
      case 'Code Wizard': return 'bg-accent-success/10 text-accent-success border-accent-success/20';
      case 'Compiler Apprentice': return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20';
      default: return 'bg-bg-elevated text-text-muted border-border-default';
    }
  };

  const socialItems = [
    { key: 'github', label: 'GitHub', icon: <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>, url: profileUser.socialLinks?.github },
    { key: 'instagram', label: 'Instagram', icon: <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>, url: profileUser.socialLinks?.instagram },
    { key: 'tiktok', label: 'TikTok', icon: <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.02a6.27 6.27 0 0 0-.88-.07 6.34 6.34 0 0 0 0 12.68 6.29 6.29 0 0 0 6.34-6.23V9.4a8.16 8.16 0 0 0 3.76.92V6.69z"/></svg>, url: profileUser.socialLinks?.tiktok },
    { key: 'linkedin', label: 'LinkedIn', icon: <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>, url: profileUser.socialLinks?.linkedin },
  ];

  const inputClass = "w-full bg-bg-app border border-border-default p-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue placeholder:text-text-muted/50";

  return (
    <div className="flex-grow flex flex-col max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <Link href="/" className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-blue transition-colors text-xs w-fit">
        <ArrowLeft size={14} /> Back to feed
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Profile Card */}
          <div className="p-5 bg-bg-card card-border rounded-xl text-center">
            <img src={profileUser.avatarUrl} alt={profileUser.displayName} className="w-20 h-20 mx-auto rounded-xl bg-bg-elevated border border-border-default p-1.5" />
            <h1 className="mt-3 text-base font-bold text-text-primary flex items-center justify-center gap-1.5">
              {profileUser.displayName}
              {isAdmin && (
                <span className="inline-flex items-center gap-0.5 text-[9px] bg-accent-danger/10 text-accent-danger border border-accent-danger/20 px-1.5 py-0.5 rounded-md font-bold uppercase">
                  <Shield size={9} /> Admin
                </span>
              )}
            </h1>
            <p className="text-xs text-accent-blue font-medium">@{profileUser.username}</p>
            <div className={`mt-3 py-1.5 px-3 border rounded-lg inline-block text-xs font-semibold ${getLevelStyle(profileUser.level)}`}>
              {profileUser.level}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-default pt-4">
              <div><span className="block text-[10px] text-text-muted uppercase">Reputation</span><span className="text-sm font-bold text-text-primary">{profileUser.reputation}</span></div>
              <div><span className="block text-[10px] text-text-muted uppercase">Threads</span><span className="text-sm font-bold text-text-primary">{userThreads.length}</span></div>
              <div><span className="block text-[10px] text-text-muted uppercase">Replies</span><span className="text-sm font-bold text-text-primary">{userReplies.length}</span></div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border-default/50 pt-3 text-[11px] font-mono text-center">
              <div className="border-r border-border-default/50">
                <span className="text-text-muted block">FOLLOWERS</span>
                <span className="text-text-primary font-bold text-xs">{followerCount}</span>
              </div>
              <div>
                <span className="text-text-muted block">FOLLOWING</span>
                <span className="text-text-primary font-bold text-xs">{followingCount}</span>
              </div>
            </div>

            {isOwnProfile ? (
              <button 
                onClick={openEditModal} 
                className="mt-4.5 w-full flex items-center justify-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-text-secondary hover:text-text-primary text-xs py-1.5 rounded-lg cursor-pointer transition-colors font-mono"
              >
                <Pencil size={12} /> Edit Profile
              </button>
            ) : (
              currentUser && (
                <div className="mt-4.5 grid grid-cols-2 gap-2 font-mono">
                  {isFollowing ? (
                    <button
                      onClick={() => unfollowUser(profileUser.id)}
                      className="px-2.5 py-1.5 border border-accent-danger/40 text-accent-danger bg-accent-danger/5 hover:bg-accent-danger/10 text-xs rounded-lg transition-all cursor-pointer"
                    >
                      [ UNFOLLOW ]
                    </button>
                  ) : (
                    <button
                      onClick={() => followUser(profileUser.id)}
                      className="px-2.5 py-1.5 border border-accent-cyan bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 text-xs rounded-lg transition-all cursor-pointer"
                    >
                      [ FOLLOW ]
                    </button>
                  )}
                  <button
                    onClick={handleMessageClick}
                    className="px-2.5 py-1.5 border border-border-default text-text-secondary hover:text-text-primary bg-bg-elevated hover:bg-hover-bg text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <MessageSquare size={11} />
                    <span>[ MESSAGE ]</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* Social Links */}
          <div className="p-4 bg-bg-card card-border rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-secondary">Social Links</h3>
              {isOwnProfile && !editingSocials && (
                <button onClick={startEditSocials} className="text-text-muted hover:text-accent-blue transition-colors cursor-pointer"><Pencil size={12} /></button>
              )}
            </div>

            {editingSocials ? (
              <div className="space-y-2">
                {[
                  ['GitHub', socialGithub, setSocialGithub, 'https://github.com/username'],
                  ['Instagram', socialInstagram, setSocialInstagram, 'https://instagram.com/username'],
                  ['TikTok', socialTiktok, setSocialTiktok, 'https://tiktok.com/@username'],
                  ['LinkedIn', socialLinkedin, setSocialLinkedin, 'https://linkedin.com/in/username'],
                ].map(([label, val, setter, placeholder]: any) => (
                  <div key={label}>
                    <label className="text-[10px] text-text-muted">{label}</label>
                    <input type="url" value={val} onChange={(e) => setter(e.target.value)} placeholder={placeholder} className={inputClass} />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button onClick={saveSocials} className="flex-1 flex items-center justify-center gap-1 bg-accent-blue/10 text-accent-blue text-xs py-1.5 rounded-lg hover:bg-accent-blue/20 cursor-pointer transition-colors"><Check size={12} /> Save</button>
                  <button onClick={() => setEditingSocials(false)} className="flex-1 flex items-center justify-center gap-1 text-text-muted text-xs py-1.5 rounded-lg hover:bg-hover-bg cursor-pointer transition-colors"><X size={12} /> Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {socialItems.map(item => (
                  <div key={item.key} className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">{item.icon}</span>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline truncate flex items-center gap-1">
                        {item.url.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-text-muted italic">Not set</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Grid */}
          <div className="p-4 bg-bg-card card-border rounded-xl">
            <h3 className="text-xs font-semibold text-text-secondary mb-3">Activity (last 91 days)</h3>
            <div className="grid grid-cols-13 gap-[3px]">
              {contribData.map((val, i) => (
                <div key={i} className={`w-[10px] h-[10px] rounded-sm ${getContribColor(val)} transition-colors`} title={`${val} contribution${val !== 1 ? 's' : ''}`} />
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-text-muted">
              <span>Less</span>
              {[0,1,2,3,4].map(v => <div key={v} className={`w-[8px] h-[8px] rounded-sm ${getContribColor(v)}`} />)}
              <span>More</span>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="p-4 bg-bg-card card-border rounded-xl">
            <h3 className="text-xs font-semibold text-text-secondary mb-3">Tech Stack</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {profileUser.techStack.length === 0 ? (
                <span className="text-text-muted text-xs italic">No badges yet</span>
              ) : profileUser.techStack.map((badge) => (
                <span key={badge} className="flex items-center gap-1 text-[11px] bg-accent-blue/10 text-accent-blue px-2 py-1 rounded-md font-medium">
                  {badge}
                  {isOwnProfile && <button onClick={() => handleRemoveBadge(badge)} className="text-accent-blue/50 hover:text-accent-danger transition-colors cursor-pointer"><Trash2 size={10} /></button>}
                </span>
              ))}
            </div>
            {isOwnProfile && (
              <form onSubmit={handleAddBadge} className="flex gap-2">
                <input type="text" required placeholder="Add skill..." value={newBadge} onChange={(e) => setNewBadge(e.target.value)} className={inputClass} />
                <button type="submit" className="p-2 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-lg cursor-pointer transition-colors"><Plus size={14} /></button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Threads */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted pb-2 border-b border-border-default">
            <span>Posts by @{profileUser.username}</span>
            <span>{userThreads.length} threads</span>
          </div>

          {userThreads.length === 0 ? (
            <div className="p-12 card-border rounded-xl text-center text-text-muted text-sm">No posts yet.</div>
          ) : userThreads.map((thread) => {
            const replyCount = replies.filter(r => r.threadId === thread.id).length;
            const cleanPreview = stripMarkdown(thread.content);
            return (
              <article key={thread.id} className="p-4 bg-bg-card card-border rounded-xl card-hover flex gap-4">
                <div className="flex flex-col items-center gap-0.5">
                  <button onClick={() => voteThread(thread.id, 'up')} disabled={!currentUser}
                    className={`vote-btn p-1 rounded-md hover:bg-hover-bg ${!currentUser ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} text-text-muted hover:text-accent-success`}>
                    <ArrowUp size={14} />
                  </button>
                  <span className="text-xs font-semibold text-text-primary">{thread.upvotes - thread.downvotes}</span>
                  <button onClick={() => voteThread(thread.id, 'down')} disabled={!currentUser}
                    className={`vote-btn p-1 rounded-md hover:bg-hover-bg ${!currentUser ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} text-text-muted hover:text-accent-danger`}>
                    <ArrowDown size={14} />
                  </button>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-[11px] text-text-muted mb-1">{new Date(thread.createdAt).toLocaleDateString()}</div>
                  <Link href={`/thread/${thread.id}`}><h2 className="text-sm font-semibold text-text-primary hover:text-accent-blue transition-colors line-clamp-1">{thread.title}</h2></Link>
                  <p className="mt-1.5 text-xs text-text-muted line-clamp-2 leading-relaxed">
                    {cleanPreview.length > 200 ? `${cleanPreview.substring(0, 200)}...` : cleanPreview}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border-default text-[10px]">
                    <div className="flex gap-1">{thread.tags.map(t => (<span key={t} className="bg-accent-blue/10 text-accent-blue px-1.5 py-0.5 rounded-md">#{t}</span>))}</div>
                    <Link href={`/thread/${thread.id}`} className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"><MessageSquare size={10} /> {replyCount}</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-bg-card card-border rounded-xl p-6 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setShowEditProfileModal(false)} 
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>

            <h2 className="text-sm font-semibold text-text-primary mb-5 flex items-center gap-1.5 border-b border-border-default pb-3">
              <Pencil size={14} className="text-accent-blue" /> Edit Profile Settings
            </h2>

            <div className="space-y-5 text-xs">
              {/* Display Name Input */}
              <div>
                <label className="block text-text-muted mb-1.5 font-medium">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="Your display name"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-bg-app border border-border-default p-2.5 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue placeholder:text-text-muted/50"
                />
              </div>

              {/* Avatar Selection Options */}
              <div>
                <label className="block text-text-muted mb-2 font-medium">Avatar Customization</label>
                
                {/* Custom Sub-tabs */}
                <div className="flex border-b border-border-default mb-4">
                  {[
                    { key: 'generator', label: 'Preset Generator' },
                    { key: 'upload', label: 'Upload File' },
                    { key: 'url', label: 'Direct Image URL' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setAvatarOption(tab.key);
                        if (tab.key === 'generator') {
                          setEditAvatarUrl(`https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(dicebearSeed)}`);
                        }
                      }}
                      className={`flex-1 pb-2 font-medium text-center border-b-2 transition-colors cursor-pointer text-xs ${
                        avatarOption === tab.key 
                          ? 'border-accent-blue text-accent-blue' 
                          : 'border-transparent text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab contents */}
                {avatarOption === 'generator' && (
                  <div className="space-y-4 p-4 bg-bg-app/40 rounded-lg border border-border-default">
                    <div className="flex gap-4 items-center">
                      <img 
                        src={`https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(dicebearSeed)}`} 
                        alt="Dicebear preview" 
                        className="w-16 h-16 rounded-lg bg-bg-elevated border border-border-default p-1"
                      />
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-[10px] text-text-muted mb-1 font-semibold uppercase tracking-wider">Style variant</label>
                          <select
                            value={dicebearStyle}
                            onChange={(e) => {
                              const style = e.target.value;
                              setDicebearStyle(style);
                              setEditAvatarUrl(`https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(dicebearSeed)}`);
                            }}
                            className="w-full bg-bg-app border border-border-default p-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                          >
                            <option value="bottts">Robots (Bottts)</option>
                            <option value="pixel-art">Pixel Art</option>
                            <option value="lorelei">Lorelei (Cute Characters)</option>
                            <option value="avataaars">Avataaars (People)</option>
                            <option value="identicon">Identicon (Abstract)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted mb-1 font-semibold uppercase tracking-wider">Seed Input (Changes avatar dynamically)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={dicebearSeed}
                          onChange={(e) => {
                            const seed = e.target.value;
                            setDicebearSeed(seed);
                            setEditAvatarUrl(`https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(seed)}`);
                          }}
                          className="flex-1 bg-bg-app border border-border-default p-2.5 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                          placeholder="Type anything to morph..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const randSeed = Math.random().toString(36).substring(7);
                            setDicebearSeed(randSeed);
                            setEditAvatarUrl(`https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(randSeed)}`);
                          }}
                          className="px-3 bg-bg-elevated hover:bg-hover-bg border border-border-default text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer text-xs font-mono"
                        >
                          Randomize
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {avatarOption === 'upload' && (
                  <div className="space-y-4 p-4 bg-bg-app/40 rounded-lg border border-border-default">
                    <div className="flex gap-4 items-center">
                      <img 
                        src={editAvatarUrl.startsWith('data:image/') || editAvatarUrl.startsWith('http') ? editAvatarUrl : `https://api.dicebear.com/7.x/bottts/svg?seed=preview`} 
                        alt="Upload preview" 
                        className="w-16 h-16 rounded-lg bg-bg-elevated border border-border-default object-cover p-1"
                      />
                      <div className="flex-1">
                        <label className="block text-[10px] text-text-muted mb-1.5 font-semibold uppercase tracking-wider">Select Image File</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border-default file:text-xs file:font-mono file:bg-bg-elevated file:text-accent-blue hover:file:bg-hover-bg file:cursor-pointer"
                        />
                        <span className="block text-[9px] text-text-muted mt-1.5">Supports PNG, JPG, WEBP, GIF (Max 2MB)</span>
                        {uploadError && <span className="block text-[10px] text-accent-danger mt-1 font-semibold">{uploadError}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {avatarOption === 'url' && (
                  <div className="space-y-4 p-4 bg-bg-app/40 rounded-lg border border-border-default">
                    <div className="flex gap-4 items-center">
                      <img 
                        src={editAvatarUrl.startsWith('http') ? editAvatarUrl : `https://api.dicebear.com/7.x/bottts/svg?seed=preview`} 
                        alt="URL preview" 
                        className="w-16 h-16 rounded-lg bg-bg-elevated border border-border-default object-cover p-1"
                        onError={(e) => {
                          (e.target as any).src = `https://api.dicebear.com/7.x/bottts/svg?seed=preview`;
                        }}
                      />
                      <div className="flex-1">
                        <label className="block text-[10px] text-text-muted mb-1.5 font-semibold uppercase tracking-wider">Image Address Link</label>
                        <input
                          type="url"
                          placeholder="https://example.com/avatar.png"
                          value={editAvatarUrl.startsWith('data:image/') ? '' : editAvatarUrl}
                          onChange={(e) => setEditAvatarUrl(e.target.value)}
                          className="w-full bg-bg-app border border-border-default p-2.5 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue placeholder:text-text-muted/50"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-border-default">
                <button
                  type="button"
                  disabled={isSaving || !!uploadError}
                  onClick={handleSaveProfile}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer text-xs font-mono"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-bg-elevated hover:bg-hover-bg border border-border-default text-text-secondary hover:text-text-primary py-2 rounded-lg transition-colors cursor-pointer text-xs font-mono"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
