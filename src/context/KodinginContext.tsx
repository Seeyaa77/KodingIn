"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Thread, Reply, Follow, Conversation, ConversationParticipant, Message } from '../lib/mockData';
import { supabase, isMock, subscribeToChannel, mapUser, mapThread, mapReply, supabaseMock } from '../lib/supabase';
import { ShieldCheck, Award } from 'lucide-react';

interface KodinginContextType {
  currentUser: (UserProfile & { role?: 'user' | 'admin' }) | null;
  users: UserProfile[];
  threads: Thread[];
  replies: Reply[];
  follows: Follow[];
  conversations: Conversation[];
  conversationParticipants: ConversationParticipant[];
  messages: Message[];
  loading: boolean;
  activeTagFilter: string;
  setActiveTagFilter: (tag: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  voteThread: (threadId: string, type: 'up' | 'down') => Promise<void>;
  createThread: (title: string, content: string, tags: string[], codePreview?: Thread['codePreview'], githubUrl?: string) => Promise<boolean>;
  createReply: (threadId: string, parentId: string | null, content: string) => Promise<void>;
  switchUserProfile: (userId: string) => void;
  registerUserProfile: (username: string, displayName: string, techStack: string[]) => void;
  logout: () => Promise<void>;
  markReplyAsSolved: (threadId: string, replyId: string | null) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  acceptConversation: (conversationId: string) => Promise<void>;
  rejectConversation: (conversationId: string) => Promise<void>;
}

const KodinginContext = createContext<KodinginContextType | undefined>(undefined);

export function KodinginProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<(UserProfile & { role?: 'user' | 'admin' }) | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationParticipants, setConversationParticipants] = useState<ConversationParticipant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTagFilter, setActiveTagFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Level up state for cool terminal celebration banner
  const [levelUpAlert, setLevelUpAlert] = useState<{username: string, newLevel: string} | null>(null);

  const refreshData = async () => {
    try {
      let activeUser: (UserProfile & { role?: 'user' | 'admin' }) | null = null;

      if (isMock) {
        // Fetch mock users
        const { data: usersData } = await supabase.from('users').select('*');
        setUsers((usersData || []).map(mapUser));

        // Fetch mock threads
        const { data: threadsData } = await supabase.from('threads').select('*').order('upvotes', { ascending: false });
        setThreads((threadsData || []).map(mapThread));

        // Fetch mock replies
        const { data: repliesData } = await supabase.from('replies').select('*');
        setReplies((repliesData || []).map(mapReply));

        // Fetch mock active user
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          activeUser = mapUser({
            id: userData.user.id,
            username: userData.user.user_metadata.username,
            displayName: userData.user.user_metadata.display_name,
            avatarUrl: userData.user.user_metadata.avatar_url,
            reputation: userData.user.user_metadata.reputation,
            techStack: userData.user.user_metadata.tech_stack,
            level: userData.user.user_metadata.level,
            role: userData.user.user_metadata.role,
            createdAt: ""
          });
          setCurrentUser(activeUser);
        } else {
          setCurrentUser(null);
        }

        // Fetch mock follows
        const { data: followsData } = await supabase.from('follows').select('*');
        setFollows((followsData || []).map((f: any) => ({
          id: f.id,
          followerId: f.followerId,
          followingId: f.followingId,
          createdAt: f.createdAt
        })));

        // Fetch mock conversations
        const { data: convsData } = await supabase.from('conversations').select('*');
        setConversations((convsData || []).map((c: any) => ({
          id: c.id,
          status: c.status,
          createdAt: c.createdAt
        })));

        // Fetch mock participants
        const { data: partsData } = await supabase.from('conversation_participants').select('*');
        setConversationParticipants((partsData || []).map((p: any) => ({
          id: p.id,
          conversationId: p.conversationId,
          userId: p.userId
        })));

        // Fetch mock messages
        const { data: msgsData } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
        setMessages((msgsData || []).map((m: any) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          content: m.content,
          isRead: m.isRead,
          createdAt: m.createdAt
        })));
      } else {
        // Fetch real database users
        const { data: usersData } = await supabase.from('users').select('*');
        setUsers((usersData || []).map(mapUser));

        // Fetch real database threads with joined users
        const { data: threadsData } = await supabase
          .from('threads')
          .select('*, users(*)')
          .order('upvotes', { ascending: false });
        
        const mappedThreads = (threadsData || []).map((t: any) => mapThread({
          ...t,
          author: t.users
        }));
        setThreads(mappedThreads);

        // Fetch real database replies with joined users
        const { data: repliesData } = await supabase.from('replies').select('*, users(*)');
        const mappedReplies = (repliesData || []).map((r: any) => mapReply({
          ...r,
          author: r.users
        }));
        setReplies(mappedReplies);

        // Fetch real authenticated session
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.user.id)
            .maybeSingle();

          if (profile) {
            activeUser = mapUser(profile);
            setCurrentUser(activeUser);
          } else {
            // Graceful fallback while database trigger completes user profile insert
            activeUser = mapUser({
              id: userData.user.id,
              username: userData.user.user_metadata.username || userData.user.email?.split('@')[0] || 'dev',
              displayName: userData.user.user_metadata.display_name || userData.user.email?.split('@')[0] || 'Developer',
              avatarUrl: userData.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData.user.id}`,
              reputation: 10,
              techStack: userData.user.user_metadata.tech_stack || [],
              level: 'Syntax Novice',
              role: 'user',
              createdAt: userData.user.created_at
            });
            setCurrentUser(activeUser);
          }
        } else {
          setCurrentUser(null);
        }

        // Fetch real follows
        const { data: followsData } = await supabase.from('follows').select('*');
        setFollows((followsData || []).map((f: any) => ({
          id: f.id,
          followerId: f.follower_id,
          followingId: f.following_id,
          createdAt: f.created_at
        })));

        if (activeUser) {
          // Real conversations the user participates in
          const { data: myParticipants } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', activeUser.id);

          const convIds = myParticipants?.map((p: any) => p.conversation_id) || [];

          if (convIds.length > 0) {
            const { data: convs } = await supabase.from('conversations').select('*').in('id', convIds);
            setConversations((convs || []).map((c: any) => ({
              id: c.id,
              status: c.status,
              createdAt: c.created_at
            })));

            const { data: allParticipants } = await supabase
              .from('conversation_participants')
              .select('*')
              .in('conversation_id', convIds);
            setConversationParticipants((allParticipants || []).map((ap: any) => ({
              id: ap.id,
              conversationId: ap.conversation_id,
              userId: ap.user_id
            })));

            const { data: msgs } = await supabase
              .from('messages')
              .select('*')
              .in('conversation_id', convIds)
              .order('created_at', { ascending: true });
            setMessages((msgs || []).map((m: any) => ({
              id: m.id,
              conversationId: m.conversation_id,
              senderId: m.sender_id,
              content: m.content,
              isRead: m.is_read,
              createdAt: m.created_at
            })));
          } else {
            setConversations([]);
            setConversationParticipants([]);
            setMessages([]);
          }
        } else {
          setConversations([]);
          setConversationParticipants([]);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Error refreshing Kodingin data:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshData().then(() => setLoading(false));

    // Setup realtime subscription listeners
    const unsubscribeThreads = subscribeToChannel('threads_changed', () => {
      refreshData();
    });

    const unsubscribeReplies = subscribeToChannel('replies_changed', () => {
      refreshData();
    });

    const unsubscribeUsers = subscribeToChannel('users_changed', () => {
      refreshData();
    });

    const unsubscribeAuth = subscribeToChannel('auth_state_change', () => {
      refreshData();
    });

    const unsubscribeFollows = subscribeToChannel('follows_changed', () => {
      refreshData();
    });

    const unsubscribeConversations = subscribeToChannel('conversations_changed', () => {
      refreshData();
    });

    const unsubscribeMessages = subscribeToChannel('messages_changed', () => {
      refreshData();
    });

    const unsubscribeLevelUp = subscribeToChannel('level_up', (payload: any) => {
      setLevelUpAlert({
        username: payload.username,
        newLevel: payload.newLevel
      });
      // Automatically hide level up alert after 6 seconds
      setTimeout(() => {
        setLevelUpAlert(null);
      }, 6000);
    });

    return () => {
      unsubscribeThreads();
      unsubscribeReplies();
      unsubscribeUsers();
      unsubscribeAuth();
      unsubscribeFollows();
      unsubscribeConversations();
      unsubscribeMessages();
      unsubscribeLevelUp();
    };
  }, []);

  const voteThread = async (threadId: string, type: 'up' | 'down') => {
    if (!currentUser) return;
    
    if (isMock) {
      await supabase.vote(currentUser.id, threadId, type);
    } else {
      try {
        const { data: existingVote } = await supabase
          .from('votes')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('thread_id', threadId)
          .maybeSingle();

        if (existingVote) {
          if (existingVote.vote_type === type) {
            // Delete vote
            await supabase.from('votes').delete().eq('id', existingVote.id);
          } else {
            // Update vote type
            await supabase.from('votes').update({ vote_type: type }).eq('id', existingVote.id);
          }
        } else {
          // Insert new vote
          await supabase.from('votes').insert({
            user_id: currentUser.id,
            thread_id: threadId,
            vote_type: type
          });
        }
        refreshData();
      } catch (err) {
        console.error("Error casting vote:", err);
      }
    }
  };

  const createThread = async (
    title: string,
    content: string,
    tags: string[],
    codePreview?: Thread['codePreview'],
    githubUrl?: string
  ) => {
    if (!currentUser) return false;
    
    if (!title.trim() || !content.trim()) return false;

    // Secure markdown checks: Purge scripts to prevent XSS (QA instruction)
    let sanitizedContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[MALICIOUS SCRIPTS DETECTED AND PURGED]");

    try {
      if (isMock) {
        const newThread = {
          userId: currentUser.id,
          title: title.trim(),
          content: sanitizedContent,
          codePreview: codePreview,
          githubUrl: githubUrl?.trim() || undefined,
          tags: tags,
          upvotes: 0,
          downvotes: 0,
        };
        await supabase.from('threads').insert(newThread);
      } else {
        const { error } = await supabase.from('threads').insert({
          user_id: currentUser.id,
          title: title.trim(),
          content: sanitizedContent,
          code_preview: codePreview || null,
          github_url: githubUrl?.trim() || null,
          tags: tags,
          upvotes: 0,
          downvotes: 0
        });
        if (error) throw error;
        refreshData();
      }
      return true;
    } catch (err) {
      console.error("Error creating thread:", err);
      return false;
    }
  };

  const createReply = async (threadId: string, parentId: string | null, content: string) => {
    if (!currentUser) return;
    if (!content.trim()) return;

    // Sanitize comment content for XSS prevention
    const sanitizedContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[Purged script]");

    try {
      if (isMock) {
        const newReply = {
          threadId,
          parentId,
          userId: currentUser.id,
          content: sanitizedContent,
        };
        await supabase.from('replies').insert(newReply);
      } else {
        const { error } = await supabase.from('replies').insert({
          thread_id: threadId,
          parent_id: parentId,
          user_id: currentUser.id,
          content: sanitizedContent
        });
        if (error) throw error;
        refreshData();
      }
    } catch (err) {
      console.error("Error posting reply:", err);
    }
  };

  const switchUserProfile = (userId: string) => {
    if (isMock) {
      supabase.auth.switchUser(userId);
    }
  };

  const registerUserProfile = (username: string, displayName: string, techStack: string[]) => {
    if (isMock) {
      supabase.auth.registerUser(username, displayName, techStack);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      if (isMock) {
        refreshData();
      }
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const markReplyAsSolved = async (threadId: string, replyId: string | null) => {
    try {
      if (isMock) {
        await supabase.from('threads').update({ solved_reply_id: replyId }).eq('id', threadId);
        
        const targetThread = threads.find(t => t.id === threadId);
        if (targetThread) {
          if (replyId) {
            const reply = replies.find(r => r.id === replyId);
            if (reply && reply.userId !== targetThread.userId) {
              await supabaseMock.adjustReputation(reply.userId, 15);
            }
          } else if (targetThread.solvedReplyId) {
            const oldReply = replies.find(r => r.id === targetThread.solvedReplyId);
            if (oldReply && oldReply.userId !== targetThread.userId) {
              await supabaseMock.adjustReputation(oldReply.userId, -15);
            }
          }
        }
        refreshData();
      } else {
        const { error } = await supabase
          .from('threads')
          .update({ solved_reply_id: replyId })
          .eq('id', threadId);
        if (error) throw error;
        refreshData();
      }
    } catch (err) {
      console.error("Error setting thread solution:", err);
    }
  };

  const followUser = async (targetId: string) => {
    if (!currentUser) return;
    try {
      if (isMock) {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetId });
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: targetId
        });
        if (error) throw error;
      }
      refreshData();
    } catch (err: any) {
      console.error("Error following user:", err?.message || err);
    }
  };

  const unfollowUser = async (targetId: string) => {
    if (!currentUser) return;
    try {
      if (isMock) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetId);
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetId);
        if (error) throw error;
      }
      refreshData();
    } catch (err: any) {
      console.error("Error unfollowing user:", err?.message || err);
    }
  };

  const acceptConversation = async (conversationId: string) => {
    try {
      if (isMock) {
        await supabase.from('conversations').update({ status: 'accepted' }).eq('id', conversationId);
      } else {
        const { error } = await supabase
          .from('conversations')
          .update({ status: 'accepted' })
          .eq('id', conversationId);
        if (error) throw error;
      }
      refreshData();
    } catch (err: any) {
      console.error("Error accepting message request:", err?.message || err);
    }
  };

  const rejectConversation = async (conversationId: string) => {
    try {
      if (isMock) {
        await supabase.from('conversations').update({ status: 'rejected' }).eq('id', conversationId);
      } else {
        const { error } = await supabase
          .from('conversations')
          .update({ status: 'rejected' })
          .eq('id', conversationId);
        if (error) throw error;
      }
      refreshData();
    } catch (err: any) {
      console.error("Error rejecting message request:", err?.message || err);
    }
  };

  const sendMessage = async (receiverId: string, content: string) => {
    if (!currentUser || !content.trim()) return;

    const sanitizedContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[Purged script]");

    try {
      // Find if there is an existing conversation
      const userConvs = conversationParticipants.filter(p => p.userId === currentUser.id).map(p => p.conversationId);
      const receiverConvs = conversationParticipants.filter(p => p.userId === receiverId).map(p => p.conversationId);
      const sharedConvId = userConvs.find(id => receiverConvs.includes(id));

      let activeConvId = sharedConvId;

      if (!activeConvId) {
        // Create new conversation
        const userFollowsReceiver = follows.some(f => f.followerId === currentUser.id && f.followingId === receiverId);
        const receiverFollowsUser = follows.some(f => f.followerId === receiverId && f.followingId === currentUser.id);
        const status = (userFollowsReceiver && receiverFollowsUser) ? 'accepted' : 'pending';
        const convId = crypto.randomUUID();

        if (isMock) {
          await supabase.from('conversations').insert({
            id: convId,
            status,
            createdAt: new Date().toISOString()
          });
          
          // Insert participants
          await supabase.from('conversation_participants').insert({
            conversation_id: convId,
            user_id: currentUser.id
          });
          await supabase.from('conversation_participants').insert({
            conversation_id: convId,
            user_id: receiverId
          });
        } else {
          const { error: convError } = await supabase
            .from('conversations')
            .insert({ id: convId, status });
          if (convError) throw convError;

          // Insert participants
          const { error: partError } = await supabase
            .from('conversation_participants')
            .insert([
              { conversation_id: convId, user_id: currentUser.id },
              { conversation_id: convId, user_id: receiverId }
            ]);
          if (partError) throw partError;
        }

        activeConvId = convId;
      } else {
        const targetConv = conversations.find(c => c.id === activeConvId);
        if (targetConv && targetConv.status === 'rejected') {
          if (isMock) {
            await supabase.from('conversations').update({ status: 'pending' }).eq('id', activeConvId);
          } else {
            await supabase.from('conversations').update({ status: 'pending' }).eq('id', activeConvId);
          }
        }
      }

      // Insert message
      if (isMock) {
        await supabase.from('messages').insert({
          conversation_id: activeConvId,
          sender_id: currentUser.id,
          content: sanitizedContent,
          is_read: false
        });
      } else {
        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: activeConvId,
          sender_id: currentUser.id,
          content: sanitizedContent,
          is_read: false
        });
        if (msgError) throw msgError;
      }

      refreshData();
    } catch (err: any) {
      console.error("Error sending message:", err?.message || err);
    }
  };

  return (
    <KodinginContext.Provider value={{
      currentUser,
      users,
      threads,
      replies,
      follows,
      conversations,
      conversationParticipants,
      messages,
      loading,
      activeTagFilter,
      setActiveTagFilter,
      searchQuery,
      setSearchQuery,
      voteThread,
      createThread,
      createReply,
      switchUserProfile,
      registerUserProfile,
      logout,
      markReplyAsSolved,
      followUser,
      unfollowUser,
      sendMessage,
      acceptConversation,
      rejectConversation
    }}>
      {children}

      {/* Level Up Celebration Toast */}
      {levelUpAlert && (
        <div className="fixed bottom-6 right-6 z-50 text-sm border border-accent-success/30 bg-bg-card p-5 rounded-xl shadow-2xl animate-fade-in max-w-sm card-border">
          <div className="flex items-center gap-2 text-accent-success font-semibold mb-2">
            <Award size={18} />
            <span>Level Unlocked!</span>
          </div>
          <p className="text-text-secondary text-xs">
            <span className="text-accent-blue font-medium">@{levelUpAlert.username}</span> has reached a new reputation level:
          </p>
          <p className="mt-3 text-accent-success font-bold text-sm tracking-wide text-center bg-accent-success/5 border border-accent-success/20 py-2 rounded-lg">
            {levelUpAlert.newLevel}
          </p>
        </div>
      )}
    </KodinginContext.Provider>
  );
}

export function useKodingin() {
  const context = useContext(KodinginContext);
  if (context === undefined) {
    throw new Error('useKodingin must be used within a KodinginProvider');
  }
  return context;
}
