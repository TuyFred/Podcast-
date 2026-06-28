-- ================================================================
--  COPY AND RUN THIS ENTIRE BLOCK IN:
--  Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- STEP 1: Create is_admin() function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- STEP 2: Drop ALL old recursive policies
DROP POLICY IF EXISTS "profiles_select_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"     ON public.profiles;
DROP POLICY IF EXISTS "notes_admin"            ON public.notes;
DROP POLICY IF EXISTS "podcasts_admin"         ON public.podcasts;
DROP POLICY IF EXISTS "summaries_admin"        ON public.summaries;
DROP POLICY IF EXISTS "quizzes_admin"          ON public.quizzes;
DROP POLICY IF EXISTS "flashcards_admin"       ON public.flashcards;

-- STEP 3: Re-create profiles policies (non-recursive)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- STEP 4: Re-create other table admin policies
CREATE POLICY "notes_admin"      ON public.notes      FOR ALL USING (public.is_admin());
CREATE POLICY "podcasts_admin"   ON public.podcasts   FOR ALL USING (public.is_admin());
CREATE POLICY "summaries_admin"  ON public.summaries  FOR ALL USING (public.is_admin());
CREATE POLICY "quizzes_admin"    ON public.quizzes    FOR ALL USING (public.is_admin());
CREATE POLICY "flashcards_admin" ON public.flashcards FOR ALL USING (public.is_admin());

-- Confirm
SELECT 'RLS infinite recursion FIXED!' AS result;
