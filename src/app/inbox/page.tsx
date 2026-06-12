"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useKodingin } from '@/context/KodinginContext';
import { useRouter, useSearchParams } from 'next/navigation';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Terminal, Send, ArrowLeft, User, Check, X, ShieldAlert, Sparkles } from 'lucide-react';

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 bg-bg-app flex items-center justify-center p-4">
        <div className="font-mono text-sm text-text-secondary">
          [~] Connecting console to mail subsystems...
        </div>
      </div>
    }>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const { 
    currentUser, 
    users, 
    conversations, 
    conversationParticipants, 
    messages, 
    sendMessage, 
    acceptConversation, 
    rejectConversation,
    follows
  } = useKodingin();

  const router = useRouter();
  const searchParams = useSearchParams();
  const selectUserId = searchParams.get('select');

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'connections' | 'requests'>('connections');
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    }
  }, [currentUser, router]);

  // Handle select query param
  useEffect(() => {
    if (selectUserId && conversationParticipants.length > 0 && currentUser) {
      const userConvs = conversationParticipants.filter(p => p.userId === currentUser.id).map(p => p.conversationId);
      const targetConvs = conversationParticipants.filter(p => p.userId === selectUserId).map(p => p.conversationId);
      const sharedConvId = userConvs.find(id => targetConvs.includes(id));
      
      if (sharedConvId) {
        setSelectedConvId(sharedConvId);
        const targetConv = conversations.find(c => c.id === sharedConvId);
        if (targetConv) {
          setActiveTab(targetConv.status === 'accepted' ? 'connections' : 'requests');
        }
      }
    }
  }, [selectUserId, conversationParticipants, currentUser, conversations]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConvId]);

  if (!currentUser) {
    return (
      <div className="flex-1 bg-bg-app flex items-center justify-center p-4">
        <div className="font-mono text-sm text-text-secondary">
          [~] Authenticating console connection...
        </div>
      </div>
    );
  }

  // Helper to find the other participant in a conversation
  const getOtherParticipant = (convId: string) => {
    const parts = conversationParticipants.filter(p => p.conversationId === convId);
    const otherPart = parts.find(p => p.userId !== currentUser.id);
    if (!otherPart) return null;
    return users.find(u => u.id === otherPart.userId) || null;
  };

  // Helper to get last message in a conversation
  const getLastMessage = (convId: string) => {
    const convMsgs = messages.filter(m => m.conversationId === convId);
    if (convMsgs.length === 0) return null;
    return convMsgs[convMsgs.length - 1];
  };

  // Filter conversations
  const filteredConvs = conversations.filter(conv => {
    const isParticipant = conversationParticipants.some(
      p => p.conversationId === conv.id && p.userId === currentUser.id
    );
    if (!isParticipant) return false;

    // Determine status
    if (activeTab === 'connections') {
      return conv.status === 'accepted';
    } else {
      // Pending request: status is pending
      return conv.status === 'pending';
    }
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const otherUser = selectedConvId ? getOtherParticipant(selectedConvId) : null;
  const activeMessages = selectedConvId 
    ? messages.filter(m => m.conversationId === selectedConvId)
    : [];

  // Determine if current user is the receiver of the pending request
  // (i.e. they did NOT send the first message)
  const isPendingReceiver = () => {
    if (!selectedConv || selectedConv.status !== 'pending') return false;
    const firstMsg = activeMessages[0];
    if (!firstMsg) return false;
    return firstMsg.senderId !== currentUser.id;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !otherUser) return;
    await sendMessage(otherUser.id, inputMessage);
    setInputMessage('');
  };

  const handleSlashCommand = (cmd: string) => {
    if (cmd === '/clear') {
      setInputMessage('');
    } else if (cmd === '/share-code') {
      setInputMessage(prev => prev + "\n```javascript\n// Write your code here\nconsole.log('Hello World');\n```\n");
    } else if (cmd === '/appreciation') {
      setInputMessage(prev => prev + "Awesome work! Thanks for the clean code output context. 👍");
    }
  };

  return (
    <div className="flex-1 bg-bg-app flex flex-col h-[calc(100vh-64px)] font-sans">
      {/* Top Banner Vibe (Simplified) */}
      <div className="bg-bg-card border-b border-border-default px-6 py-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-text-primary font-semibold">
          <span>Inbox</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-text-secondary">
          <span>@{currentUser.username}</span>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Explorer Sidebar */}
        <div className={`w-full md:w-80 bg-bg-card md:border-r border-border-default flex flex-col ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
          {/* Buffer Tabs */}
          <div className="grid grid-cols-2 border-b border-border-default text-xs">
            <button
              onClick={() => {
                setActiveTab('connections');
                setSelectedConvId(null);
              }}
              className={`py-3 text-center border-b-2 transition-all font-mono cursor-pointer ${
                activeTab === 'connections'
                  ? 'border-accent-blue text-accent-blue bg-bg-app/30'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Conversations
            </button>
            <button
              onClick={() => {
                setActiveTab('requests');
                setSelectedConvId(null);
              }}
              className={`py-3 text-center border-b-2 transition-all font-mono relative cursor-pointer ${
                activeTab === 'requests'
                  ? 'border-accent-blue text-accent-blue bg-bg-app/30'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Requests
              {conversations.filter(c => c.status === 'pending' && messages.filter(m => m.conversationId === c.id)[0]?.senderId !== currentUser.id).length > 0 && (
                <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-accent-warning animate-pulse" />
              )}
            </button>
          </div>

          {/* Buffer List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {filteredConvs.length === 0 ? (
              <div className="text-text-muted p-4 text-center font-mono">
                No chats found.
              </div>
            ) : (
              filteredConvs.map(conv => {
                const partner = getOtherParticipant(conv.id);
                const lastMsg = getLastMessage(conv.id);
                const isSelected = selectedConvId === conv.id;

                if (!partner) return null;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-2.5 rounded-md transition-all flex items-center gap-3 border cursor-pointer ${
                      isSelected
                        ? 'bg-bg-elevated border-border-hover text-text-primary shadow-sm'
                        : 'bg-transparent border-transparent text-text-secondary hover:bg-hover-bg hover:text-text-primary'
                    }`}
                  >
                    <img 
                      src={partner.avatarUrl} 
                      alt={partner.username}
                      className="w-8 h-8 rounded-md bg-bg-app border border-border-default" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate">
                          {partner.displayName}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-text-muted font-mono">
                            {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="text-[10px] text-text-muted font-mono truncate">
                          @{partner.username}
                        </span>
                        <p className="text-[10px] text-text-muted truncate flex-1 pl-2 text-right">
                          {lastMsg ? lastMsg.content : 'No messages.'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Message Pane */}
        <div className={`flex-1 bg-bg-app flex flex-col overflow-hidden ${selectedConvId ? 'flex' : 'hidden md:flex'}`}>
          {selectedConvId && otherUser ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Details */}
              <div className="bg-bg-card border-b border-border-default px-4 md:px-6 py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button 
                    onClick={() => setSelectedConvId(null)}
                    className="md:hidden p-1 hover:bg-hover-bg rounded text-text-secondary hover:text-text-primary transition-colors mr-1 cursor-pointer shrink-0"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <img 
                    src={otherUser.avatarUrl} 
                    alt={otherUser.username}
                    className="w-8 h-8 rounded-md bg-bg-app border border-border-default shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-text-primary flex items-center gap-1.5 sm:gap-2">
                      <span className="truncate max-w-[120px] sm:max-w-none">{otherUser.displayName}</span>
                      <span className="text-[10px] text-text-muted font-mono hidden sm:inline truncate">@{otherUser.username}</span>
                    </div>
                    <div className="text-[9px] text-text-muted font-mono uppercase tracking-wider">
                      Status: {selectedConv?.status}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => router.push(`/profile/${otherUser.username}`)}
                  className="text-accent-blue hover:underline flex items-center gap-1 cursor-pointer font-mono text-xs border border-accent-blue/20 bg-accent-blue/5 px-2.5 py-1 rounded-md shrink-0"
                >
                  <User size={12} />
                  <span>[ PROFILE ]</span>
                </button>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="text-[10px] text-text-muted font-mono bg-bg-elevated border border-border-default px-2.5 py-1 rounded-md text-center">
                    🔒 Connection encrypted via secure protocols
                  </div>
                </div>

                {activeMessages.map((msg, index) => {
                  const isMe = msg.senderId === currentUser.id;
                  
                  return (
                    <div 
                      key={msg.id || index}
                      className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Bubble */}
                        <div className={`px-3 py-2 text-sm card-border rounded-md shadow-sm ${
                          isMe 
                            ? 'bg-accent-blue/10 border-accent-blue/20 text-text-primary' 
                            : 'bg-bg-card border-border-default text-text-primary'
                        }`}>
                          <MarkdownRenderer content={msg.content} />
                        </div>
                        {/* Timestamp */}
                        <span className="text-[9px] text-text-muted font-mono mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Request Action Area */}
              {selectedConv?.status === 'pending' && isPendingReceiver() && (
                <div className="mx-4 md:mx-6 mb-2 p-4 bg-bg-card card-border rounded-md flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="text-accent-warning shrink-0 mt-0.5" size={18} />
                    <div className="text-xs">
                      <p className="text-text-primary font-bold">[CONNECTION REQUEST]</p>
                      <p className="text-text-secondary mt-1">
                        @{otherUser.username} is not mutual with you. Accept connection buffer to allow replies.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => acceptConversation(selectedConvId)}
                      className="px-4 py-2 border border-accent-success/40 text-accent-success bg-accent-success/5 hover:bg-accent-success/10 font-mono text-xs rounded-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>[ ACCEPT ]</span>
                    </button>
                    <button
                      onClick={() => rejectConversation(selectedConvId)}
                      className="px-4 py-2 border border-accent-danger/40 text-accent-danger bg-accent-danger/5 hover:bg-accent-danger/10 font-mono text-xs rounded-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <X size={14} />
                      <span>[ REJECT ]</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Waiting Approval Area */}
              {selectedConv?.status === 'pending' && !isPendingReceiver() && (
                <div className="mx-4 md:mx-6 mb-2 px-4 py-3 bg-bg-card card-border rounded-md font-mono text-[11px] text-accent-warning flex items-center gap-2">
                  <span className="animate-pulse">⏳</span>
                  <span>[PENDING] Waiting for @{otherUser.username} to accept your connection request...</span>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-4 bg-bg-card border-t border-border-default">
                {/* Quick actions helper */}
                <div className="flex overflow-x-auto gap-2 mb-3 text-[10px] pb-1 whitespace-nowrap scrollbar-none">
                  <span className="text-text-muted select-none font-mono shrink-0">Quick Replies:</span>
                  <button 
                    type="button"
                    onClick={() => handleSlashCommand('/share-code')}
                    className="px-2 py-0.5 border border-border-default rounded hover:border-accent-blue text-accent-blue cursor-pointer transition-colors font-mono shrink-0"
                  >
                    [ SHARE CODE ]
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSlashCommand('/appreciation')}
                    className="px-2 py-0.5 border border-border-default rounded hover:border-accent-blue text-accent-blue cursor-pointer transition-colors font-mono shrink-0"
                  >
                    [ APPRECIATE ]
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSlashCommand('/clear')}
                    className="px-2 py-0.5 border border-border-default rounded hover:border-accent-danger text-accent-danger cursor-pointer transition-colors font-mono shrink-0"
                  >
                    [ CLEAR ]
                  </button>
                </div>

                <form onSubmit={handleSend} className="flex gap-2">
                  <div className="flex-1 bg-bg-app border border-border-default rounded-md px-3 py-2 flex items-center gap-2 text-sm focus-within:border-accent-blue transition-colors">
                    <input 
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted/65 text-sm"
                      disabled={selectedConv?.status === 'pending' && isPendingReceiver()}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || (selectedConv?.status === 'pending' && isPendingReceiver())}
                    className="px-4 py-2 border border-accent-blue/30 bg-accent-blue/10 text-accent-blue rounded-md hover:bg-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1.5 font-mono text-xs"
                  >
                    <Send size={13} />
                    <span>[SEND]</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Empty state
            <div className="flex-1 flex flex-col justify-center items-center p-6 text-center text-xs text-text-secondary select-none">
              <Terminal size={28} className="text-text-muted mb-3 opacity-60" />
              <p className="font-bold font-mono text-text-primary mb-1">Inbox Connection Idle</p>
              <p className="text-text-muted">No conversation active.</p>
              <p className="text-text-muted mt-2 max-w-xs font-mono text-[10px]">
                Select a user connection from the left sidebar to load the conversation packet logs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
