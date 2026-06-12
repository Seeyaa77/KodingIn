-- Kodingin Database Schema Migration Script (Supabase SQL Editor)
-- Run this script in your Supabase SQL Editor to provision tables, triggers, and RLS policies.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing triggers, tables, and types for a clean setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_thread_solution_changed ON public.threads;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.replies CASCADE;
DROP TABLE IF EXISTS public.threads CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;


-- Create User Role Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.user_role AS ENUM ('user', 'admin');
  END IF;
END$$;


-- 1. Users Table (Linked to Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT NOT NULL,
  reputation INT DEFAULT 10 NOT NULL,
  tech_stack TEXT[] DEFAULT '{}' NOT NULL,
  level VARCHAR(50) DEFAULT 'Syntax Novice' NOT NULL,
  role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Threads Table
CREATE TABLE public.threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  code_preview JSONB, -- Stores sandbox {html, css, js} if included
  github_url TEXT,
  tags TEXT[] DEFAULT '{}' NOT NULL,
  upvotes INT DEFAULT 0 NOT NULL,
  downvotes INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Replies Table
CREATE TABLE public.replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.replies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Votes Table
CREATE TABLE public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE NOT NULL,
  vote_type VARCHAR(10) CHECK (vote_type IN ('up', 'down')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_thread_vote UNIQUE (user_id, thread_id)
);

-- Add solved_reply_id relation to threads (Q&A solved feature)
ALTER TABLE public.threads ADD COLUMN solved_reply_id UUID REFERENCES public.replies(id) ON DELETE SET NULL;

-- ----------------------------------------------------
-- DATABASE TRIGGERS
-- ----------------------------------------------------

-- A. Trigger function to sync auth.users registration to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username VARCHAR(50);
  v_display_name VARCHAR(100);
  v_avatar_url TEXT;
  v_role public.user_role;
BEGIN
  -- Extract username from metadata or email prefix
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'user_name',
    split_part(NEW.email, '@', 1)
  );

  -- Sanitize and check for duplicate usernames
  v_username := LOWER(REGEXP_REPLACE(v_username, '\s+', '_', 'g'));
  IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username) THEN
    v_username := v_username || '_' || FLOOR(RANDOM() * 1000)::text;
  END IF;

  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Provisions default avatar URL using Dicebear SVG keyed on username
  v_avatar_url := 'https://api.dicebear.com/7.x/bottts/svg?seed=' || v_username;

  -- Determine role
  IF v_username = 'kodingin_admin' OR NEW.email LIKE '%admin%' OR NEW.raw_user_meta_data->>'role' = 'admin' THEN
    v_role := 'admin'::public.user_role;
  ELSE
    v_role := 'user'::public.user_role;
  END IF;

  INSERT INTO public.users (id, username, display_name, avatar_url, reputation, tech_stack, level, role)
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_avatar_url,
    10,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'tech_stack')), '{}'::text[]),
    'Syntax Novice',
    v_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- B. Trigger function to automatically calculate upvotes/downvotes and adjust reputation
CREATE OR REPLACE FUNCTION public.handle_vote_change()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_reputation_change INT := 0;
BEGIN
  -- Identify thread author
  SELECT user_id INTO v_author_id FROM public.threads WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);

  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE public.threads SET upvotes = upvotes + 1 WHERE id = NEW.thread_id;
      v_reputation_change := 10;
    ELSE
      UPDATE public.threads SET downvotes = downvotes + 1 WHERE id = NEW.thread_id;
      v_reputation_change := -2;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE public.threads SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.thread_id;
      v_reputation_change := -10;
    ELSE
      UPDATE public.threads SET downvotes = GREATEST(0, downvotes - 1) WHERE id = OLD.thread_id;
      v_reputation_change := 2;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = NEW.vote_type THEN
      RETURN NEW;
    END IF;
    
    IF NEW.vote_type = 'up' THEN
      UPDATE public.threads SET upvotes = upvotes + 1, downvotes = GREATEST(0, downvotes - 1) WHERE id = NEW.thread_id;
      v_reputation_change := 12; -- +10 (upvote) + 2 (removing downvote penalty)
    ELSE
      UPDATE public.threads SET downvotes = downvotes + 1, upvotes = GREATEST(0, upvotes - 1) WHERE id = NEW.thread_id;
      v_reputation_change := -12; -- -2 (downvote) - 10 (removing upvote)
    END IF;
  END IF;

  -- Update target user's reputation (exclude self-voting)
  IF v_author_id IS NOT NULL AND v_author_id <> COALESCE(NEW.user_id, OLD.user_id) AND v_reputation_change <> 0 THEN
    UPDATE public.users 
    SET reputation = GREATEST(0, reputation + v_reputation_change) 
    WHERE id = v_author_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vote_changed
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.handle_vote_change();


-- C. Trigger function to calculate reputation levels
CREATE OR REPLACE FUNCTION public.check_user_level_up()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reputation < 100 THEN
    NEW.level := 'Syntax Novice';
  ELSIF NEW.reputation < 500 THEN
    NEW.level := 'Compiler Apprentice';
  ELSIF NEW.reputation < 1500 THEN
    NEW.level := 'Code Wizard';
  ELSIF NEW.reputation < 5000 THEN
    NEW.level := 'State Wizard';
  ELSE
    NEW.level := 'Kernel Archmage';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_reputation_changed
BEFORE UPDATE OF reputation ON public.users
FOR EACH ROW EXECUTE FUNCTION public.check_user_level_up();


-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 1. Users policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.users 
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- 2. Threads policies
CREATE POLICY "Threads are viewable by everyone" ON public.threads 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON public.threads 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners and admins can update threads" ON public.threads 
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'::public.user_role
  );

CREATE POLICY "Owners and admins can delete threads" ON public.threads 
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'::public.user_role
  );

-- 3. Replies policies
CREATE POLICY "Replies are viewable by everyone" ON public.replies 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create replies" ON public.replies 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners and admins can update replies" ON public.replies 
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'::public.user_role
  );

CREATE POLICY "Owners and admins can delete replies" ON public.replies 
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'::public.user_role
  );

-- 4. Votes policies
CREATE POLICY "Votes are viewable by everyone" ON public.votes 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.votes 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can update their own vote" ON public.votes 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vote" ON public.votes 
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------
-- SYNC EXISTING USERS
-- ----------------------------------------------------
-- Sync existing users from auth.users to public.users (avoids missing profiles after reset)
CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS void AS $$
DECLARE
  usr RECORD;
  v_username VARCHAR(50);
  v_display_name VARCHAR(100);
  v_avatar_url TEXT;
  v_role public.user_role;
BEGIN
  FOR usr IN SELECT * FROM auth.users LOOP
    v_username := COALESCE(
      usr.raw_user_meta_data->>'username',
      usr.raw_user_meta_data->>'user_name',
      split_part(usr.email, '@', 1)
    );
    v_username := LOWER(REGEXP_REPLACE(v_username, '\s+', '_', 'g'));
    
    -- Ensure uniqueness of username during sync
    IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username AND id <> usr.id) THEN
      v_username := v_username || '_' || FLOOR(RANDOM() * 1000)::text;
    END IF;

    v_display_name := COALESCE(
      usr.raw_user_meta_data->>'display_name',
      usr.raw_user_meta_data->>'full_name',
      split_part(usr.email, '@', 1)
    );

    v_avatar_url := 'https://api.dicebear.com/7.x/bottts/svg?seed=' || v_username;

    -- Determine role
    IF v_username = 'kodingin_admin' OR usr.email LIKE '%admin%' OR usr.raw_user_meta_data->>'role' = 'admin' THEN
      v_role := 'admin'::public.user_role;
    ELSE
      v_role := 'user'::public.user_role;
    END IF;

    INSERT INTO public.users (id, username, display_name, avatar_url, reputation, tech_stack, level, role)
    VALUES (
      usr.id,
      v_username,
      v_display_name,
      v_avatar_url,
      10,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(usr.raw_user_meta_data->'tech_stack')), '{}'::text[]),
      'Syntax Novice',
      v_role
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      role = EXCLUDED.role;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync
SELECT public.sync_existing_users();

-- Clean up helper function
DROP FUNCTION public.sync_existing_users();


-- D. Trigger function to adjust reputation when thread solution is set/unset
CREATE OR REPLACE FUNCTION public.handle_thread_solution_change()
RETURNS TRIGGER AS $$
DECLARE
  v_old_reply_author_id UUID;
  v_new_reply_author_id UUID;
BEGIN
  -- 1. If old solved_reply_id is removed or changed, deduct 15 reputation points from the old replier
  IF OLD.solved_reply_id IS NOT NULL AND (NEW.solved_reply_id IS NULL OR NEW.solved_reply_id <> OLD.solved_reply_id) THEN
    SELECT user_id INTO v_old_reply_author_id FROM public.replies WHERE id = OLD.solved_reply_id;
    -- Only deduct if the replier is not the thread owner (self-answers don't get reputation)
    IF v_old_reply_author_id IS NOT NULL AND v_old_reply_author_id <> OLD.user_id THEN
      UPDATE public.users 
      SET reputation = GREATEST(0, reputation - 15)
      WHERE id = v_old_reply_author_id;
    END IF;
  END IF;

  -- 2. If new solved_reply_id is set, award 15 reputation points to the new replier
  IF NEW.solved_reply_id IS NOT NULL AND (OLD.solved_reply_id IS NULL OR NEW.solved_reply_id <> OLD.solved_reply_id) THEN
    SELECT user_id INTO v_new_reply_author_id FROM public.replies WHERE id = NEW.solved_reply_id;
    -- Only award if the replier is not the thread owner (self-answers don't get reputation)
    IF v_new_reply_author_id IS NOT NULL AND v_new_reply_author_id <> NEW.user_id THEN
      UPDATE public.users 
      SET reputation = reputation + 15
      WHERE id = v_new_reply_author_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_thread_solution_changed
AFTER UPDATE OF solved_reply_id ON public.threads
FOR EACH ROW EXECUTE FUNCTION public.handle_thread_solution_change();


-- ----------------------------------------------------
-- FOLLOWS AND DIRECT MESSAGES SYSTEM (NEW)
-- ----------------------------------------------------

-- Helper function to fetch conversation ids for a user without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_conversations(user_uuid UUID)
RETURNS TABLE (conversation_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT cp.conversation_id 
  FROM public.conversation_participants cp
  WHERE cp.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. Follows Table
CREATE TABLE public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id),
  CONSTRAINT check_not_self CHECK (follower_id <> following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allows public read access to follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Allows users to follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Allows users to unfollow others"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);


-- 2. Conversations Table
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow participant select conversation"
  ON public.conversations FOR SELECT
  USING (
    id IN (SELECT public.get_user_conversations(auth.uid())) OR
    NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id
    )
  );

CREATE POLICY "Allow insert conversation"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update conversation status"
  ON public.conversations FOR UPDATE
  USING (
    id IN (SELECT public.get_user_conversations(auth.uid()))
  );


-- 3. Conversation Participants Table
CREATE TABLE public.conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT unique_conversation_user UNIQUE (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    conversation_id IN (SELECT public.get_user_conversations(auth.uid()))
  );

CREATE POLICY "Allow participant registration"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- 4. Messages Table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow participants to read messages"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (SELECT public.get_user_conversations(auth.uid()))
  );

CREATE POLICY "Allow participants to send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (SELECT public.get_user_conversations(auth.uid()))
  );


