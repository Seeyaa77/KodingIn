import { createClient } from '@supabase/supabase-js';
import { initialUsers, initialThreads, initialReplies, UserProfile, Thread, Reply, Vote } from './mockData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isMock = !(supabaseUrl && supabaseAnonKey);

// Helper to check if localStorage is available
const isClient = typeof window !== 'undefined';

// Initialize localStorage with seed data if empty (for local emulator/mock fallback)
if (isClient) {
  if (!localStorage.getItem('kodingku_users')) {
    localStorage.setItem('kodingku_users', JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem('kodingku_threads')) {
    localStorage.setItem('kodingku_threads', JSON.stringify(initialThreads));
  }
  if (!localStorage.getItem('kodingku_replies')) {
    localStorage.setItem('kodingku_replies', JSON.stringify(initialReplies));
  }
  if (!localStorage.getItem('kodingku_votes')) {
    localStorage.setItem('kodingku_votes', JSON.stringify([]));
  }
  if (!localStorage.getItem('kodingku_current_user_id')) {
    // Default logged in user: dan_react (user-2)
    localStorage.setItem('kodingku_current_user_id', 'user-2');
  }
}

// ----------------------------------------------------
// DB to UI Casing Mappers
// ----------------------------------------------------
export const mapUser = (dbUser: any): UserProfile & { role: 'user' | 'admin' } => {
  if (!dbUser) return null as any;
  return {
    id: dbUser.id,
    username: dbUser.username,
    displayName: dbUser.display_name || dbUser.displayName || dbUser.username,
    avatarUrl: dbUser.avatar_url || dbUser.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${dbUser.username}`,
    reputation: dbUser.reputation !== undefined ? dbUser.reputation : 10,
    techStack: dbUser.tech_stack || dbUser.techStack || [],
    level: dbUser.level || 'Syntax Novice',
    role: dbUser.role || 'user',
    createdAt: dbUser.created_at || dbUser.createdAt || new Date().toISOString(),
    socialLinks: dbUser.social_links || dbUser.socialLinks || undefined
  };
};

export const mapThread = (dbThread: any): Thread => {
  if (!dbThread) return null as any;
  return {
    id: dbThread.id,
    userId: dbThread.user_id || dbThread.userId,
    title: dbThread.title,
    content: dbThread.content,
    codePreview: dbThread.code_preview 
      ? {
          html: dbThread.code_preview.html || '',
          css: dbThread.code_preview.css || '',
          js: dbThread.code_preview.js || ''
        }
      : dbThread.codePreview 
        ? dbThread.codePreview 
        : undefined,
    githubUrl: dbThread.github_url || dbThread.githubUrl || undefined,
    tags: dbThread.tags || [],
    upvotes: dbThread.upvotes !== undefined ? dbThread.upvotes : 0,
    downvotes: dbThread.downvotes !== undefined ? dbThread.downvotes : 0,
    createdAt: dbThread.created_at || dbThread.createdAt,
    solvedReplyId: dbThread.solved_reply_id || dbThread.solvedReplyId || undefined,
    author: dbThread.author 
      ? mapUser(dbThread.author) 
      : dbThread.users 
        ? mapUser(dbThread.users) 
        : undefined
  };
};

export const mapReply = (dbReply: any): Reply => {
  if (!dbReply) return null as any;
  return {
    id: dbReply.id,
    threadId: dbReply.thread_id || dbReply.threadId,
    parentId: dbReply.parent_id !== undefined ? dbReply.parent_id : dbReply.parentId,
    userId: dbReply.user_id || dbReply.userId,
    content: dbReply.content,
    createdAt: dbReply.created_at || dbReply.createdAt,
    author: dbReply.author 
      ? mapUser(dbReply.author) 
      : dbReply.users 
        ? mapUser(dbReply.users) 
        : undefined
  };
};

// ----------------------------------------------------
// Realtime PubSub & Supabase Subscriptions
// ----------------------------------------------------
type Callback = (payload: any) => void;
const listeners = new Map<string, Set<Callback>>();

export const subscribeToChannel = (channel: string, callback: Callback) => {
  if (isMock) {
    if (!listeners.has(channel)) {
      listeners.set(channel, new Set());
    }
    listeners.get(channel)!.add(callback);
    
    return () => {
      const channelListeners = listeners.get(channel);
      if (channelListeners) {
        channelListeners.delete(callback);
        if (channelListeners.size === 0) {
          listeners.delete(channel);
        }
      }
    };
  } else {
    // Real Supabase Realtime Subscription
    if (channel === 'auth_state_change') {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
        callback(session);
      });
      return () => {
        subscription.unsubscribe();
      };
    }

    let table = '';
    if (channel === 'threads_changed') table = 'threads';
    else if (channel === 'replies_changed') table = 'replies';
    else if (channel === 'users_changed') table = 'users';

    if (!table) {
      // Fallback/dummy unsubscribe for channels like level_up
      return () => {};
    }

    const realtimeChannel = supabase
      .channel(`${table}_realtime_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload: any) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }
};

export const broadcastToChannel = (channel: string, payload: any) => {
  if (isMock) {
    const channelListeners = listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach((callback: Callback) => {
        try {
          callback(payload);
        } catch (err) {
          console.error("Error in real-time subscriber:", err);
        }
      });
    }
  }
};

// Helper function to create a real Promise decorated with custom chainable operations
// This resolves the strict Next.js TypeScript check on await operands in Mock Client
const makeQueryPromise = (data: any, error: any): Promise<{ data: any; error: any }> & {
  eq: (col: string, val: any) => any;
  order: (col: string, options?: { ascending?: boolean }) => any;
} => {
  const promise = Promise.resolve({ data, error }) as any;

  promise.eq = function (col: string, val: any) {
    const filtered = data ? data.filter((item: any) => item[col] === val) : [];
    return makeQueryPromise(filtered, error);
  };

  promise.order = function (col: string, { ascending = false } = {}) {
    if (!data) return makeQueryPromise(data, error);
    const ordered = [...data].sort((a: any, b: any) => {
      const valA = a[col];
      const valB = b[col];
      if (typeof valA === 'string') {
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return ascending ? valA - valB : valB - valA;
    });
    return makeQueryPromise(ordered, error);
  };

  return promise;
};

// Custom Mock Client
export class MockSupabaseClient {
  private getStorage<T>(key: string): T[] {
    if (!isClient) return [];
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : [];
  }

  private setStorage<T>(key: string, data: T[]): void {
    if (!isClient) return;
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Auth Operations
  auth = {
    getUser: async () => {
      if (!isClient) return { data: { user: null }, error: null };
      const userId = localStorage.getItem('kodingku_current_user_id');
      if (!userId) return { data: { user: null }, error: null };
      
      const users = this.getStorage<UserProfile>('kodingku_users');
      const userProfile = users.find(u => u.id === userId) || null;
      if (!userProfile) return { data: { user: null }, error: null };

      return {
        data: {
          user: {
            id: userProfile.id,
            email: `${userProfile.username}@kodingku.dev`,
            user_metadata: {
              username: userProfile.username,
              display_name: userProfile.displayName,
              avatar_url: userProfile.avatarUrl,
              reputation: userProfile.reputation,
              tech_stack: userProfile.techStack,
              level: userProfile.level,
              role: (userProfile as any).role || 'user'
            }
          }
        },
        error: null
      };
    },
    
    signInWithOAuth: async (provider: string) => {
      console.log(`Mocking OAuth login via ${provider}`);
      if (isClient) {
        // Change user to user-3 (kodingku_dev)
        localStorage.setItem('kodingku_current_user_id', 'user-3');
      }
      return { data: { provider }, error: null };
    },

    signOut: async () => {
      if (isClient) {
        localStorage.removeItem('kodingku_current_user_id');
      }
      return { error: null };
    },

    // Mock switching user for testing different accounts/roles in demo
    switchUser: (userId: string) => {
      if (isClient) {
        localStorage.setItem('kodingku_current_user_id', userId);
        broadcastToChannel('auth_state_change', userId);
      }
    },

    registerUser: (username: string, displayName: string, techStack: string[]) => {
      if (!isClient) return null;
      const users = this.getStorage<UserProfile>('kodingku_users');
      const exists = users.find(u => u.username === username);
      if (exists) return exists;

      const newUser: UserProfile & { role: string } = {
        id: `user-${Date.now()}`,
        username: username.toLowerCase().replace(/\s+/g, '_'),
        displayName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        reputation: 10,
        techStack,
        level: "Syntax Novice",
        role: "user",
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      this.setStorage('kodingku_users', users);
      localStorage.setItem('kodingku_current_user_id', newUser.id);
      broadcastToChannel('auth_state_change', newUser.id);
      return newUser;
    }
  };

  // Database Query Builders
  from(table: string) {
    const client = this;
    let storeKey = '';
    
    switch (table) {
      case 'users': storeKey = 'kodingku_users'; break;
      case 'threads': storeKey = 'kodingku_threads'; break;
      case 'replies': storeKey = 'kodingku_replies'; break;
      case 'votes': storeKey = 'kodingku_votes'; break;
      default: storeKey = table;
    }

    return {
      select: (columns: string = '*') => {
        let items = client.getStorage<any>(storeKey);
        
        // Attach authors if selecting threads or replies
        if (table === 'threads') {
          const users = client.getStorage<UserProfile>('kodingku_users');
          items = items.map(item => ({
            ...item,
            author: users.find(u => u.id === item.userId) || null
          }));
        } else if (table === 'replies') {
          const users = client.getStorage<UserProfile>('kodingku_users');
          items = items.map(item => ({
            ...item,
            author: users.find(u => u.id === item.userId) || null
          }));
        }

        return makeQueryPromise(items, null);
      },

      insert: (record: any) => {
        const items = client.getStorage<any>(storeKey);
        
        // Map any real Supabase field names from snake_case to camelCase for mock
        const mappedRecord = { ...record };
        if (record.user_id) {
          mappedRecord.userId = record.user_id;
          delete mappedRecord.user_id;
        }
        if (record.thread_id) {
          mappedRecord.threadId = record.thread_id;
          delete mappedRecord.thread_id;
        }
        if (record.parent_id !== undefined) {
          mappedRecord.parentId = record.parent_id;
          delete mappedRecord.parent_id;
        }
        if (record.code_preview) {
          mappedRecord.codePreview = record.code_preview;
          delete mappedRecord.code_preview;
        }
        if (record.github_url) {
          mappedRecord.githubUrl = record.github_url;
          delete mappedRecord.github_url;
        }
        if (record.solved_reply_id !== undefined) {
          mappedRecord.solvedReplyId = record.solved_reply_id;
          delete mappedRecord.solved_reply_id;
        }

        const newRecord = {
          id: mappedRecord.id || `${table.slice(0, -1)}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...mappedRecord
        };

        items.push(newRecord);
        client.setStorage(storeKey, items);

        // Calculate reputation on new tutorial threads
        if (table === 'threads') {
          const isTutor = newRecord.tags?.includes('Tutor');
          if (isTutor) {
            client.adjustReputation(newRecord.userId, 15);
          }
          
          const users = client.getStorage<UserProfile>('kodingku_users');
          newRecord.author = users.find(u => u.id === newRecord.userId);
          
          broadcastToChannel('threads_changed', { type: 'INSERT', record: newRecord });
        }

        if (table === 'replies') {
          const users = client.getStorage<UserProfile>('kodingku_users');
          newRecord.author = users.find(u => u.id === newRecord.userId);
          
          broadcastToChannel('replies_changed', { type: 'INSERT', record: newRecord });
        }

        return Promise.resolve({ data: [newRecord], error: null });
      },

      update: (updates: any) => {
        return {
          eq: (col: string, val: any) => {
            const items = client.getStorage<any>(storeKey);
            let updatedRecords: any[] = [];
            
            // Map column names for compatibility
            let searchCol = col;
            if (col === 'user_id') searchCol = 'userId';

            const mappedUpdates = { ...updates };
            if (updates.solved_reply_id !== undefined) {
              mappedUpdates.solvedReplyId = updates.solved_reply_id;
              delete mappedUpdates.solved_reply_id;
            }
            if (updates.social_links !== undefined) {
              mappedUpdates.socialLinks = updates.social_links;
              delete mappedUpdates.social_links;
            }
            if (updates.avatar_url !== undefined) {
              mappedUpdates.avatarUrl = updates.avatar_url;
              delete mappedUpdates.avatar_url;
            }
            if (updates.display_name !== undefined) {
              mappedUpdates.displayName = updates.display_name;
              delete mappedUpdates.display_name;
            }
            if (updates.tech_stack !== undefined) {
              mappedUpdates.techStack = updates.tech_stack;
              delete mappedUpdates.tech_stack;
            }

            const newItems = items.map((item: any) => {
              if (item[searchCol] === val) {
                const updated = { ...item, ...mappedUpdates };
                updatedRecords.push(updated);
                return updated;
              }
              return item;
            });

            client.setStorage(storeKey, newItems);

            if (table === 'threads') {
              broadcastToChannel('threads_changed', { type: 'UPDATE', records: updatedRecords });
            }
            if (table === 'users') {
              broadcastToChannel('users_changed', { type: 'UPDATE', records: updatedRecords });
            }

            return Promise.resolve({ data: updatedRecords, error: null });
          }
        };
      },

      delete: () => {
        return {
          eq: (col: string, val: any) => {
            const items = client.getStorage<any>(storeKey);
            
            let searchCol = col;
            if (col === 'user_id') searchCol = 'userId';
            
            const remaining = items.filter((item: any) => item[searchCol] !== val);
            client.setStorage(storeKey, remaining);

            if (table === 'threads') {
              broadcastToChannel('threads_changed', { type: 'DELETE', id: val });
            }
            if (table === 'replies') {
              broadcastToChannel('replies_changed', { type: 'DELETE', id: val });
            }

            return Promise.resolve({ data: null, error: null });
          }
        };
      }
    };
  }

  // Custom helper to upvote/downvote and handle RLS & Reputation systems in mock mode
  async vote(userId: string, threadId: string, type: 'up' | 'down') {
    if (!isClient) return { error: 'Not on client' };

    const votes = this.getStorage<Vote>('kodingku_votes');
    const threads = this.getStorage<Thread>('kodingku_threads');
    
    const threadIndex = threads.findIndex(t => t.id === threadId);
    if (threadIndex === -1) return { error: 'Thread not found' };
    const thread = threads[threadIndex];

    const existingVoteIdx = votes.findIndex(v => v.userId === userId && v.threadId === threadId);
    let reputationDiff = 0;

    if (existingVoteIdx !== -1) {
      const existingVote = votes[existingVoteIdx];
      if (existingVote.voteType === type) {
        votes.splice(existingVoteIdx, 1);
        if (type === 'up') {
          thread.upvotes = Math.max(0, thread.upvotes - 1);
          reputationDiff = -10;
        } else {
          thread.downvotes = Math.max(0, thread.downvotes - 1);
          reputationDiff = 2;
        }
      } else {
        votes[existingVoteIdx].voteType = type;
        if (type === 'up') {
          thread.upvotes += 1;
          thread.downvotes = Math.max(0, thread.downvotes - 1);
          reputationDiff = 12;
        } else {
          thread.downvotes += 1;
          thread.upvotes = Math.max(0, thread.upvotes - 1);
          reputationDiff = -12;
        }
      }
    } else {
      votes.push({ userId, threadId, voteType: type });
      if (type === 'up') {
        thread.upvotes += 1;
        reputationDiff = 10;
      } else {
        thread.downvotes += 1;
        reputationDiff = -2;
      }
    }

    threads[threadIndex] = thread;
    this.setStorage('kodingku_threads', threads);
    this.setStorage('kodingku_votes', votes);

    if (thread.userId !== userId && reputationDiff !== 0) {
      await this.adjustReputation(thread.userId, reputationDiff);
    }

    const users = this.getStorage<UserProfile>('kodingku_users');
    thread.author = users.find(u => u.id === thread.userId);
    broadcastToChannel('threads_changed', { type: 'UPDATE', record: thread });

    return { data: thread, error: null };
  }

  async adjustReputation(userId: string, diff: number) {
    const users = this.getStorage<UserProfile>('kodingku_users');
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const user = users[userIndex];
    user.reputation = Math.max(0, user.reputation + diff);

    let oldLevel = user.level;
    if (user.reputation < 100) {
      user.level = "Syntax Novice";
    } else if (user.reputation < 500) {
      user.level = "Compiler Apprentice";
    } else if (user.reputation < 1500) {
      user.level = "Code Wizard";
    } else if (user.reputation < 5000) {
      user.level = "State Wizard";
    } else {
      user.level = "Kernel Archmage";
    }

    users[userIndex] = user;
    this.setStorage('kodingku_users', users);

    if (isClient && localStorage.getItem('kodingku_current_user_id') === userId) {
      broadcastToChannel('auth_state_change', userId);
    }

    if (oldLevel !== user.level) {
      broadcastToChannel('level_up', { userId, username: user.username, newLevel: user.level });
    }
  }
}

// Export singleton instances
export const supabaseMock = new MockSupabaseClient();
export const supabase = (!isMock)
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (supabaseMock as any);
