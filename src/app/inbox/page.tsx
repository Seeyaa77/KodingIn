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
    <div className="flex-1 bg-bg-app flex flex-col h-[calc(100vh-64px)]">
      {/* Top Banner Vibe */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-6 py-3 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2 text-text-secondary">
          <Terminal size={14} className="text-accent-cyan" />
          <span>sys@kodingin:~$ mail --list-buffers</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-accent-success">● SERVER ONLINE</span>
          <span className="text-text-muted">|</span>
          <span className="text-text-secondary">USER: @{currentUser.username}</span>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Explorer Sidebar */}
        <div className="w-80 bg-[#161b22] border-r border-[#30363d] flex flex-col">
          {/* Buffer Tabs */}
          <div className="grid grid-cols-2 border-b border-[#30363d] font-mono text-xs">
            <button
              onClick={() => {
                setActiveTab('connections');
                setSelectedConvId(null);
              }}
              className={`py-3 text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'connections'
                  ? 'border-accent-cyan text-accent-cyan bg-bg-app/35'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              📁 connections/
            </button>
            <button
              onClick={() => {
                setActiveTab('requests');
                setSelectedConvId(null);
              }}
              className={`py-3 text-center border-b-2 transition-all relative cursor-pointer ${
                activeTab === 'requests'
                  ? 'border-accent-cyan text-accent-cyan bg-bg-app/35'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              📁 requests/
              {conversations.filter(c => c.status === 'pending' && messages.filter(m => m.conversationId === c.id)[0]?.senderId !== currentUser.id).length > 0 && (
                <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-accent-warning animate-pulse" />
              )}
            </button>
          </div>

          {/* Buffer List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
            {filteredConvs.length === 0 ? (
              <div className="text-text-muted p-4 text-center">
                No active buffers.
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
                    className={`w-full text-left p-2.5 rounded transition-all flex items-center gap-3 border cursor-pointer ${
                      isSelected
                        ? 'bg-[#21262d] border-[#30363d] text-text-primary'
                        : 'bg-transparent border-transparent text-text-secondary hover:bg-[#1a1f29] hover:text-text-primary'
                    }`}
                  >
                    <img 
                      src={partner.avatarUrl} 
                      alt={partner.username}
                      className="w-7 h-7 rounded-md bg-[#0a0a0f] border border-[#30363d]" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate">
                          {partner.username}.{activeTab === 'connections' ? 'md' : 'log'}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-text-muted">
                            {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">
                        {lastMsg ? lastMsg.content : 'No logs recorded.'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Message Pane */}
        <div className="flex-1 bg-bg-app flex flex-col overflow-hidden">
          {selectedConvId && otherUser ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Details */}
              <div className="bg-[#161b22] border-b border-[#30363d] px-6 py-3 flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-accent-cyan" />
                  <span className="text-text-primary">
                    Buffer: /home/kodingin/inbox/{otherUser.username}.{selectedConv?.status === 'accepted' ? 'md' : 'log'}
                  </span>
                  <span className="text-text-muted">|</span>
                  <span className="text-text-muted">MODE: {selectedConv?.status?.toUpperCase()}</span>
                </div>
                <button 
                  onClick={() => router.push(`/profile/${otherUser.username}`)}
                  className="text-accent-cyan hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <User size={12} />
                  <span>View Profile</span>
                </button>
              </div>

              {/* Chat Log Stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
                <div className="text-text-muted border-b border-[#30363d]/50 pb-2 text-[10px]">
                  [SYSTEM] Initialized secure socket channel. Streaming messages:
                </div>

                {activeMessages.map((msg, index) => {
                  const isMe = msg.senderId === currentUser.id;
                  const senderUser = isMe ? currentUser : otherUser;
                  
                  return (
                    <div 
                      key={msg.id || index}
                      className="group flex flex-col gap-1 border-l-2 border-transparent hover:border-accent-cyan/30 pl-2 transition-all"
                    >
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-text-muted">
                          [{new Date(msg.createdAt).toLocaleTimeString()}]
                        </span>
                        <span className={isMe ? 'text-accent-success' : 'text-accent-cyan'}>
                          &lt;{senderUser.username}&gt;
                        </span>
                      </div>
                      <div className="pl-4 font-sans text-sm text-text-primary">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Request Action Area */}
              {selectedConv?.status === 'pending' && isPendingReceiver() && (
                <div className="mx-6 mb-2 p-4 bg-[#21262d] border border-[#30363d] rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="text-accent-warning shrink-0 mt-0.5" size={18} />
                    <div className="font-mono text-xs">
                      <p className="text-text-primary font-bold">[CONNECTION REQUEST]</p>
                      <p className="text-text-secondary mt-1">
                        @{otherUser.username} is not mutual with you. Accept connection buffer to allow replies.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => acceptConversation(selectedConvId)}
                      className="px-4 py-2 border border-accent-success/40 text-accent-success bg-accent-success/5 hover:bg-accent-success/10 font-mono text-xs rounded transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>[ ACCEPT ]</span>
                    </button>
                    <button
                      onClick={() => rejectConversation(selectedConvId)}
                      className="px-4 py-2 border border-accent-danger/40 text-accent-danger bg-accent-danger/5 hover:bg-accent-danger/10 font-mono text-xs rounded transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <X size={14} />
                      <span>[ REJECT ]</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Waiting Approval Area */}
              {selectedConv?.status === 'pending' && !isPendingReceiver() && (
                <div className="mx-6 mb-2 px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg font-mono text-[11px] text-accent-warning flex items-center gap-2">
                  <span className="animate-pulse">⏳</span>
                  <span>[PENDING] Waiting for @{otherUser.username} to accept your connection request...</span>
                </div>
              )}

              {/* Chat Command Input Bar */}
              <div className="p-4 bg-[#161b22] border-t border-[#30363d]">
                {/* Slash commands helper */}
                <div className="flex flex-wrap gap-2 mb-3 font-mono text-[10px]">
                  <span className="text-text-muted select-none">Quick Commands:</span>
                  <button 
                    onClick={() => handleSlashCommand('/share-code')}
                    className="px-1.5 py-0.5 border border-[#30363d] rounded hover:border-accent-cyan text-accent-cyan cursor-pointer transition-colors"
                  >
                    /share-code
                  </button>
                  <button 
                    onClick={() => handleSlashCommand('/appreciation')}
                    className="px-1.5 py-0.5 border border-[#30363d] rounded hover:border-accent-cyan text-accent-cyan cursor-pointer transition-colors"
                  >
                    /appreciation
                  </button>
                  <button 
                    onClick={() => handleSlashCommand('/clear')}
                    className="px-1.5 py-0.5 border border-[#30363d] rounded hover:border-accent-danger text-accent-danger cursor-pointer transition-colors"
                  >
                    /clear
                  </button>
                </div>

                <form onSubmit={handleSend} className="flex gap-2">
                  <div className="flex-1 bg-bg-app border border-[#30363d] rounded-md px-3 py-2 flex items-center gap-2 font-mono text-sm focus-within:border-accent-cyan transition-colors">
                    <span className="text-text-muted select-none">sys@kodingin:~$</span>
                    <input 
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type a message or command..."
                      className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted font-sans text-sm"
                      disabled={selectedConv?.status === 'pending' && isPendingReceiver()}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || (selectedConv?.status === 'pending' && isPendingReceiver())}
                    className="px-4 py-2 border border-accent-cyan bg-accent-cyan/10 text-accent-cyan rounded-md hover:bg-accent-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Send size={14} />
                    <span className="font-mono text-xs">[SEND]</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Terminal Empty state
            <div className="flex-1 flex flex-col justify-center items-center p-6 text-center font-mono text-xs text-text-secondary select-none">
              <Terminal size={32} className="text-text-muted mb-4 animate-pulse" />
              <p className="font-bold text-text-primary mb-1">sys@kodingin:~$ mail --read</p>
              <p className="text-text-muted">[INFO] No active buffer loaded.</p>
              <p className="text-text-muted mt-2 max-w-sm">
                Select a user log file from the connections tree on the left sidebar to stream communication packets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
