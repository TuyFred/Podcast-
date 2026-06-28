-- ================================================================
--  PERMANENT FIX: RLS Infinite Recursion on profiles
--  Run this in: Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- ── 1. Drop ALL existing policies on profiles (they cause recursion) ──
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users"  ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

-- ── 2. Create a SECURITY DEFINER function to check admin role
--       This avoids the recursive query inside RLS policies ──
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin'
  );
END;
$$;

-- ── 3. Recreate policies without recursion ──

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (needed on first login)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles (using SECURITY DEFINER function — no recursion)
CREATE POLICY "profiles_admin_select_all"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update all profiles
CREATE POLICY "profiles_admin_update_all"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- ── 4. Also fix RLS on other tables that may have similar issues ──

-- notes: users see only their own
DROP POLICY IF EXISTS "notes_select_own" ON public.notes;
CREATE POLICY "notes_select_own" ON public.notes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notes_insert_own" ON public.notes;
CREATE POLICY "notes_insert_own" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notes_update_own" ON public.notes;
CREATE POLICY "notes_update_own" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notes_delete_own" ON public.notes;
CREATE POLICY "notes_delete_own" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- quizzes: users see only their own
DROP POLICY IF EXISTS "quizzes_select_own" ON public.quizzes;
CREATE POLICY "quizzes_select_own" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "quizzes_insert_own" ON public.quizzes;
CREATE POLICY "quizzes_insert_own" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- flashcards: users see only their own
DROP POLICY IF EXISTS "flashcards_select_own" ON public.flashcards;
CREATE POLICY "flashcards_select_own" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "flashcards_insert_own" ON public.flashcards;
CREATE POLICY "flashcards_insert_own" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- summaries: users see only their own
DROP POLICY IF EXISTS "summaries_select_own" ON public.summaries;
CREATE POLICY "summaries_select_own" ON public.summaries FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "summaries_insert_own" ON public.summaries;
CREATE POLICY "summaries_insert_own" ON public.summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- podcasts: users see only their own
DROP POLICY IF EXISTS "podcasts_select_own" ON public.podcasts;
CREATE POLICY "podcasts_select_own" ON public.podcasts FOR SELECT USING (auth.uid() = user_id);

SELECT 'RLS policies fixed successfully! ✅' AS result;
