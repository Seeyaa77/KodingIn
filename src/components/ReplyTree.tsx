"use client";

import React, { useState } from 'react';
import { Reply as ReplyType, UserProfile } from '../lib/mockData';
import { CornerDownRight, MessageSquare, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReplyNodeProps {
  reply: ReplyType & { replies?: ReplyNodeProps['reply'][] };
  currentUser: (UserProfile & { role?: 'user' | 'admin' }) | null;
  onAddReply: (parentId: string, content: string) => void;
  depth: number;
}

function ReplyNode({ reply, currentUser, onAddReply, depth }: ReplyNodeProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onAddReply(reply.id, replyText);
    setReplyText(''); setShowReplyForm(false);
  };

  return (
    <div className="mt-3">
      <div className="p-3 bg-bg-card card-border rounded-xl card-hover">
        <div className="flex items-center justify-between mb-1.5 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-secondary">{reply.author?.displayName || reply.userId}</span>
            <span>@{reply.author?.username || 'user'}</span>
            <span className="bg-bg-elevated px-1.5 py-0.5 rounded-md text-[10px]">{reply.author?.reputation || 0} pts</span>
          </div>
          <span className="text-[11px]">{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <p className="text-sm text-text-primary pl-0.5 break-words whitespace-pre-wrap leading-relaxed">{reply.content}</p>

        <div className="mt-2.5 flex items-center gap-3 text-xs text-text-muted">
          {currentUser && (
            <button onClick={() => setShowReplyForm(!showReplyForm)} className="flex items-center gap-1 hover:text-accent-blue transition-colors cursor-pointer">
              <CornerDownRight size={11} /> Reply
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button onClick={async () => { if (confirm("Delete this reply?")) { await supabase.from('replies').delete().eq('id', reply.id); } }}
              className="text-accent-danger hover:underline cursor-pointer">Delete</button>
          )}
        </div>

        {showReplyForm && (
          <form onSubmit={handleSubmit} className="mt-3 pl-3 border-l-2 border-accent-blue/30">
            <div className="flex items-center gap-2">
              <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." autoFocus
                className="flex-grow bg-bg-app border border-border-default px-3 py-2 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
              <button type="submit" className="p-2 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-lg cursor-pointer transition-colors">
                <Send size={14} />
              </button>
            </div>
          </form>
        )}
      </div>

      {reply.replies && reply.replies.length > 0 && (
        <div className="pl-5 border-l border-border-default mt-1 ml-3">
          {reply.replies.map((childReply) => (
            <ReplyNode key={childReply.id} reply={childReply} currentUser={currentUser} onAddReply={onAddReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ReplyTreeProps {
  replies: ReplyType[];
  currentUser: (UserProfile & { role?: 'user' | 'admin' }) | null;
  onAddReply: (parentId: string | null, content: string) => void;
}

export default function ReplyTree({ replies, currentUser, onAddReply }: ReplyTreeProps) {
  const [rootReplyText, setRootReplyText] = useState('');

  // O(N) tree builder
  const buildTree = (flatList: ReplyType[]): (ReplyType & { replies: any[] })[] => {
    const map: Record<string, any> = {};
    const roots: any[] = [];
    flatList.forEach((item) => { map[item.id] = { ...item, replies: [] }; });
    flatList.forEach((item) => {
      const mapped = map[item.id];
      if (item.parentId === null) { roots.push(mapped); }
      else { const parent = map[item.parentId]; if (parent) parent.replies.push(mapped); else roots.push(mapped); }
    });
    const sortTree = (nodes: any[]) => { nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); nodes.forEach(n => { if (n.replies?.length) sortTree(n.replies); }); };
    sortTree(roots);
    return roots;
  };

  const tree = buildTree(replies);

  const handleSubmitRoot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootReplyText.trim()) return;
    onAddReply(null, rootReplyText);
    setRootReplyText('');
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4 text-sm text-text-secondary font-medium border-b border-border-default pb-3">
        <MessageSquare size={15} />
        <span>{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</span>
      </div>

      {currentUser ? (
        <form onSubmit={handleSubmitRoot} className="mb-6 p-4 bg-bg-card card-border rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-xs text-text-muted">
            <span>Replying as</span>
            <span className="text-accent-blue font-medium">{currentUser.displayName}</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={rootReplyText} onChange={(e) => setRootReplyText(e.target.value)} placeholder="Write a reply..."
              className="flex-grow bg-bg-app border border-border-default px-3 py-2.5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
            <button type="submit" className="px-4 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">Reply</button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-3 border border-accent-blue/20 bg-accent-blue/5 rounded-xl flex items-center gap-2 text-xs text-accent-blue">
          <AlertCircle size={14} />
          <span>Sign in to join the discussion.</span>
        </div>
      )}

      <div className="space-y-3">
        {tree.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm card-border rounded-xl">No replies yet. Be the first to respond!</div>
        ) : tree.map((reply) => (
          <ReplyNode key={reply.id} reply={reply} currentUser={currentUser} onAddReply={(parentId, content) => onAddReply(parentId, content)} depth={0} />
        ))}
      </div>
    </div>
  );
}
