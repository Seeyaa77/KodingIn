export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  reputation: number;
  techStack: string[];
  level: string;
  role?: 'user' | 'admin';
  createdAt: string;
  socialLinks?: {
    github?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
  };
}

export interface Thread {
  id: string;
  userId: string;
  title: string;
  content: string;
  codePreview?: {
    html: string;
    css: string;
    js: string;
  };
  githubUrl?: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  createdAt: string;
  author?: UserProfile;
  solvedReplyId?: string;
}

export interface Reply {
  id: string;
  threadId: string;
  parentId: string | null;
  userId: string;
  content: string;
  createdAt: string;
  author?: UserProfile;
  replies?: Reply[]; // For hierarchical UI structures
}

export interface Vote {
  userId: string;
  threadId: string;
  voteType: 'up' | 'down';
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export const initialUsers: UserProfile[] = [
  {
    id: "user-1",
    username: "linus_git",
    displayName: "Linus Torvalds",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=linus",
    reputation: 9420,
    techStack: ["C", "Assembly", "Git", "Linux", "Bash"],
    level: "Kernel Archmage",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-2",
    username: "dan_react",
    displayName: "Dan Abramov",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=dan",
    reputation: 4200,
    techStack: ["React", "JavaScript", "TypeScript", "Next.js", "CSS"],
    level: "State Wizard",
    createdAt: "2026-02-15T00:00:00Z",
  },
  {
    id: "user-3",
    username: "kodingin_dev",
    displayName: "KodingIn Admin",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
    reputation: 1337,
    techStack: ["Next.js", "TypeScript", "Supabase", "Express", "Tailwind"],
    level: "System Root",
    role: "admin",
    createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "user-4",
    username: "junior_bug_hunter",
    displayName: "Junior Dev",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=junior",
    reputation: 80,
    techStack: ["HTML", "CSS", "JavaScript"],
    level: "Syntax Novice",
    createdAt: "2026-06-01T00:00:00Z",
  }
];

export const initialThreads: Thread[] = [
  {
    id: "thread-1",
    userId: "user-3",
    title: "Welcome to KodingIn - The Developer Community Platform!",
    content: "Welcome, developers! KodingIn is a minimal, developer-first community system built using Next.js, TypeScript, Supabase, and Express.js.\n\n### System Info\n- Filter timelines using the Tabs above.\n- Paste a GitHub URL to render a beautiful repository preview.\n- Share code with Markdown and test frontend snippets live!\n\nHere is how you can render a blinking terminal cursor in your CSS:\n\n```css\n.cursor-blink::after {\n  content: '█';\n  animation: pulse 1s infinite;\n}\n```\n\nFeel free to explore, post questions using `#Ask`, share templates using `#Showcase`, write guides using `#Tutor`, or post funny code jokes using `#Meme`!",
    tags: ["Showcase", "Tutor"],
    upvotes: 42,
    downvotes: 1,
    createdAt: "2026-06-08T10:00:00Z"
  },
  {
    id: "thread-2",
    userId: "user-2",
    title: "Interactive Live Preview: CSS Glassmorphism Card",
    content: "I wanted to share a simple interactive CSS Glassmorphism Card layout. You can edit the code inside the live preview editor below and see it compile instantly in the sandbox iframe!\n\nThis is achieved using React client-side state passing data to a `srcDoc` iframe sandbox. Play with the HTML, CSS, or JS below to try it out yourself!",
    codePreview: {
      html: `<div class="card">
  <h2>Glassmorphism Card</h2>
  <p>A beautiful glassmorphic card design rendered live in the KodingIn sandbox environment. Edit the HTML, CSS, or JavaScript tab to see changes instantly!</p>
  <button id="alertBtn">Click Me</button>
</div>`,
      css: `body {
  background: linear-gradient(135deg, #1e1e24 0%, #0d1117 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  font-family: system-ui, sans-serif;
  color: #f8f8f2;
}

.card {
  background: rgba(22, 27, 34, 0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  border-radius: 8px;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

h2 {
  margin-top: 0;
  color: #8be9fd;
}

p {
  font-size: 14px;
  line-height: 1.6;
  color: #8b949e;
}

button {
  background: #50fa7b;
  color: #0d1117;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 12px;
  transition: opacity 0.2s;
}

button:hover {
  opacity: 0.9;
}`,
      js: `document.getElementById('alertBtn').addEventListener('click', () => {
  alert('Greetings from the KodingIn Sandbox!');
});`
    },
    tags: ["Showcase", "Tutor"],
    upvotes: 38,
    downvotes: 0,
    createdAt: "2026-06-08T12:00:00Z"
  },
  {
    id: "thread-3",
    userId: "user-4",
    title: "WARNING: Why you shouldn't write code like this. Check this out.",
    content: "I inherited this codebase from our legacy subcontractor. I literally cannot understand what is going on here. Look at these nested callbacks and global mutations. View at your own risk. `#NSFC` (Not Safe For Code)!\n\nHere is a screenshot of the codebase spaghetti:",
    tags: ["Meme", "NSFC"],
    upvotes: 12,
    downvotes: 2,
    createdAt: "2026-06-08T15:30:00Z"
  },
  {
    id: "thread-4",
    userId: "user-1",
    title: "My favorite open-source Git terminal tool",
    content: "If you are tired of the default git CLI log visualization, you should check out the **lazygit** repository. It is a simple terminal UI for git commands written in Go.\n\nTake a look at the repo below:",
    githubUrl: "https://github.com/jesseduffield/lazygit",
    tags: ["Showcase"],
    upvotes: 89,
    downvotes: 1,
    createdAt: "2026-06-08T16:15:00Z"
  }
];

export const initialReplies: Reply[] = [
  {
    id: "reply-1",
    threadId: "thread-1",
    parentId: null,
    userId: "user-2",
    content: "This terminal aesthetic is really cool! I love the Dracula theme colors. Can we add a code output terminal mock as well?",
    createdAt: "2026-06-08T10:15:00Z"
  },
  {
    id: "reply-2",
    threadId: "thread-1",
    parentId: "reply-1",
    userId: "user-3",
    content: "Absolutely! The live preview feature actually acts as a code output sandbox. Check out the CSS Glassmorphism Card post in the timeline!",
    createdAt: "2026-06-08T10:30:00Z"
  },
  {
    id: "reply-3",
    threadId: "thread-1",
    parentId: null,
    userId: "user-4",
    content: "Testing nested reply capability. Will this show up inside a tree structure?",
    createdAt: "2026-06-08T11:00:00Z"
  },
  {
    id: "reply-4",
    threadId: "thread-1",
    parentId: "reply-3",
    userId: "user-1",
    content: "Yes, it should dynamically build a tree using a recursive component, avoiding the N+1 database fetching pattern by loading comments in a single batch query or recursive CTE structure.",
    createdAt: "2026-06-08T11:15:00Z"
  },
  {
    id: "reply-5",
    threadId: "thread-3",
    parentId: null,
    userId: "user-2",
    content: "Oh my god, my eyes are bleeding. That global variables nesting is a crime against humanity. Please rewrite this immediately.",
    createdAt: "2026-06-08T15:45:00Z"
  },
  {
    id: "reply-6",
    threadId: "thread-3",
    parentId: "reply-5",
    userId: "user-4",
    content: "Haha, I am trying! But if I touch it, the server crashes. It is held together by hope.",
    createdAt: "2026-06-08T16:00:00Z"
  }
];

export const initialFollows: Follow[] = [
  {
    id: "follow-1",
    followerId: "user-1",
    followingId: "user-2",
    createdAt: "2026-06-08T08:00:00Z"
  },
  {
    id: "follow-2",
    followerId: "user-2",
    followingId: "user-1",
    createdAt: "2026-06-08T08:05:00Z"
  },
  {
    id: "follow-3",
    followerId: "user-4",
    followingId: "user-2",
    createdAt: "2026-06-08T08:10:00Z"
  }
];

export const initialConversations: Conversation[] = [
  {
    id: "conv-1",
    status: "accepted",
    createdAt: "2026-06-08T17:00:00Z"
  },
  {
    id: "conv-2",
    status: "pending",
    createdAt: "2026-06-08T18:00:00Z"
  }
];

export const initialConversationParticipants: ConversationParticipant[] = [
  {
    id: "cp-1",
    conversationId: "conv-1",
    userId: "user-1"
  },
  {
    id: "cp-2",
    conversationId: "conv-1",
    userId: "user-2"
  },
  {
    id: "cp-3",
    conversationId: "conv-2",
    userId: "user-4"
  },
  {
    id: "cp-4",
    conversationId: "conv-2",
    userId: "user-2"
  }
];

export const initialMessages: Message[] = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    senderId: "user-1",
    content: "Hey Dan, React 19 looks really interesting with Server Actions.",
    isRead: true,
    createdAt: "2026-06-08T17:00:00Z"
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    senderId: "user-2",
    content: "Thanks Linus! It's all about Server Components and cleaner data fetching. Let me know if you want to try integrating it into a custom kernel status portal.",
    isRead: false,
    createdAt: "2026-06-08T17:05:00Z"
  },
  {
    id: "msg-3",
    conversationId: "conv-2",
    senderId: "user-4",
    content: "Hi Dan, can you review my pull request? I am struggling with a re-render bug and would appreciate some wizard insights.",
    isRead: false,
    createdAt: "2026-06-08T18:00:00Z"
  }
];
