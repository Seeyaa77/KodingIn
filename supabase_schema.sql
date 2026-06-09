-- Kodingku Database Schema Migration Script (Supabase SQL Editor)
-- Run this script in your Supabase SQL Editor to provision tables, triggers, and RLS policies.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create User Role Enum
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

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

  INSERT INTO public.users (id, username, display_name, avatar_url, reputation, tech_stack, level, role)
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_avatar_url,
    10,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'tech_stack')), '{}'::text[]),
    'Syntax Novice',
    'user'::public.user_role
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
