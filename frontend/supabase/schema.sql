-- ================================================================
--  VoiceAI — Supabase Schema
--  Paste this into: Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- ── Extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Drop existing types (safe re-run) ──────────────────────────
DO $$ BEGIN
  CREATE TYPE education_level_enum    AS ENUM ('high_school','undergraduate','postgraduate','professional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role_enum          AS ENUM ('user','admin','instructor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_enum       AS ENUM ('free','premium','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE file_type_enum          AS ENUM ('pdf','docx','txt','pptx');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_enum         AS ENUM ('beginner','intermediate','advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE processing_status_enum  AS ENUM ('pending','processing','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE voice_type_enum         AS ENUM ('google_tts','elevenlabs','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE generation_status_enum  AS ENUM ('pending','script_generated','audio_processing','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flashcard_category_enum AS ENUM ('definition','concept','theory','application','formula','procedure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flashcard_diff_enum     AS ENUM ('easy','medium','hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE summary_type_enum       AS ENUM ('comprehensive','medium','exam_revision','one_minute');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── auto-update updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

-- ================================================================
-- TABLE: profiles   (mirrors auth.users)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT          NOT NULL,
  first_name            TEXT,
  last_name             TEXT,
  phone                 TEXT,
  profile_picture_url   TEXT,
  institution           TEXT,
  education_level       education_level_enum DEFAULT 'undergraduate',
  field_of_study        TEXT,
  is_email_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
  role                  user_role_enum NOT NULL DEFAULT 'user',
  subscription_status   subscription_enum NOT NULL DEFAULT 'free',
  subscription_expiry   TIMESTAMPTZ,
  last_login            TIMESTAMPTZ,
  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop first for safe re-run)
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all"   ON public.profiles;

CREATE POLICY "profiles_select_own"  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"   ON public.profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ── Trigger: auto-create profile on signup ──────────────────────
-- Uses EXCEPTION WHEN OTHERS so signup never fails even if insert fails
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, education_level, is_email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'education_level')::education_level_enum,
      'undergraduate'
    ),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- fail silently so signup always succeeds
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- TABLE: notes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id                    UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID                   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                 TEXT                   NOT NULL,
  description           TEXT,
  original_file_name    TEXT                   NOT NULL DEFAULT '',
  file_size             BIGINT                 NOT NULL DEFAULT 0,
  file_path             TEXT                   NOT NULL DEFAULT '',
  file_type             file_type_enum         NOT NULL DEFAULT 'txt',
  extracted_text        TEXT,
  cleaned_text          TEXT,
  course_name           TEXT,
  subject_area          TEXT,
  difficulty_level      difficulty_enum        NOT NULL DEFAULT 'intermediate',
  main_topics           JSONB,
  sub_topics            JSONB,
  learning_objectives   JSONB,
  keywords              JSONB,
  processing_status     processing_status_enum NOT NULL DEFAULT 'pending',
  processing_error      TEXT,
  ai_processed_at       TIMESTAMPTZ,
  is_public             BOOLEAN                NOT NULL DEFAULT FALSE,
  view_count            INTEGER                NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ            NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select"  ON public.notes;
DROP POLICY IF EXISTS "notes_insert"  ON public.notes;
DROP POLICY IF EXISTS "notes_update"  ON public.notes;
DROP POLICY IF EXISTS "notes_delete"  ON public.notes;
DROP POLICY IF EXISTS "notes_admin"   ON public.notes;

CREATE POLICY "notes_select" ON public.notes FOR SELECT  USING (auth.uid() = user_id OR is_public);
CREATE POLICY "notes_insert" ON public.notes FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update" ON public.notes FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "notes_delete" ON public.notes FOR DELETE  USING (auth.uid() = user_id);
CREATE POLICY "notes_admin"  ON public.notes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_status  ON public.notes(processing_status);

-- ================================================================
-- TABLE: podcasts
-- ================================================================
CREATE TABLE IF NOT EXISTS public.podcasts (
  id                UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  notes_id          UUID                    NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id           UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             TEXT                    NOT NULL,
  description       TEXT,
  script_content    TEXT,
  audio_file_path   TEXT,
  audio_url         TEXT,
  audio_file_size   BIGINT,
  duration          INTEGER,
  voice_type        voice_type_enum         NOT NULL DEFAULT 'google_tts',
  voice_settings    JSONB,
  language          TEXT                    NOT NULL DEFAULT 'en',
  generation_status generation_status_enum  NOT NULL DEFAULT 'pending',
  generation_error  TEXT,
  generated_at      TIMESTAMPTZ,
  download_count    INTEGER                 NOT NULL DEFAULT 0,
  stream_count      INTEGER                 NOT NULL DEFAULT 0,
  is_public         BOOLEAN                 NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "podcasts_select" ON public.podcasts;
DROP POLICY IF EXISTS "podcasts_insert" ON public.podcasts;
DROP POLICY IF EXISTS "podcasts_update" ON public.podcasts;
DROP POLICY IF EXISTS "podcasts_delete" ON public.podcasts;

CREATE POLICY "podcasts_select" ON public.podcasts FOR SELECT  USING (auth.uid() = user_id OR is_public);
CREATE POLICY "podcasts_insert" ON public.podcasts FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "podcasts_update" ON public.podcasts FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "podcasts_delete" ON public.podcasts FOR DELETE  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_podcasts_updated_at ON public.podcasts;
CREATE TRIGGER set_podcasts_updated_at BEFORE UPDATE ON public.podcasts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_podcasts_user_id  ON public.podcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_notes_id ON public.podcasts(notes_id);

-- ================================================================
-- TABLE: summaries
-- ================================================================
CREATE TABLE IF NOT EXISTS public.summaries (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  notes_id     UUID              NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id      UUID              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  summary_type summary_type_enum NOT NULL,
  content      TEXT              NOT NULL,
  word_count   INTEGER,
  reading_time INTEGER,
  key_points   JSONB,
  focus_areas  JSONB,
  generated_at TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "summaries_own" ON public.summaries;
CREATE POLICY "summaries_own" ON public.summaries FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_summaries_updated_at ON public.summaries;
CREATE TRIGGER set_summaries_updated_at BEFORE UPDATE ON public.summaries
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_summaries_user_id  ON public.summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_notes_id ON public.summaries(notes_id);

-- ================================================================
-- TABLE: quizzes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  notes_id         UUID        NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT,
  total_questions  INTEGER     NOT NULL DEFAULT 20,
  questions        JSONB       NOT NULL DEFAULT '[]'::JSONB,
  time_limit       INTEGER,
  passing_score    FLOAT       NOT NULL DEFAULT 70,
  is_published     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quizzes_own" ON public.quizzes;
CREATE POLICY "quizzes_own" ON public.quizzes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_user_id  ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_notes_id ON public.quizzes(notes_id);

-- ================================================================
-- TABLE: flashcards
-- ================================================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id                    UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  notes_id              UUID                    NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id               UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question              TEXT                    NOT NULL,
  answer                TEXT                    NOT NULL,
  category              flashcard_category_enum,
  difficulty            flashcard_diff_enum     NOT NULL DEFAULT 'medium',
  topic                 TEXT,
  tags                  JSONB,
  explanation           TEXT,
  examples              JSONB,
  user_review_count     INTEGER                 NOT NULL DEFAULT 0,
  user_correct_count    INTEGER                 NOT NULL DEFAULT 0,
  user_incorrect_count  INTEGER                 NOT NULL DEFAULT 0,
  next_review_date      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flashcards_own" ON public.flashcards;
CREATE POLICY "flashcards_own" ON public.flashcards FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_flashcards_updated_at ON public.flashcards;
CREATE TRIGGER set_flashcards_updated_at BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id  ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_notes_id ON public.flashcards(notes_id);

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('notes-files', 'notes-files', FALSE, 52428800,
    ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']),
  ('audio-files', 'audio-files', TRUE,  104857600,
    ARRAY['audio/mpeg','audio/mp3','audio/wav']),
  ('avatars',     'avatars',     TRUE,  5242880,
    ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "notes_files_upload" ON storage.objects;
DROP POLICY IF EXISTS "notes_files_read"   ON storage.objects;
DROP POLICY IF EXISTS "audio_files_read"   ON storage.objects;
DROP POLICY IF EXISTS "audio_files_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_read"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload"     ON storage.objects;

CREATE POLICY "notes_files_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notes-files' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
CREATE POLICY "notes_files_read"   ON storage.objects FOR SELECT
  USING (bucket_id = 'notes-files' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
CREATE POLICY "audio_files_read"   ON storage.objects FOR SELECT  USING (bucket_id = 'audio-files');
CREATE POLICY "audio_files_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-files' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
CREATE POLICY "avatars_read"       ON storage.objects FOR SELECT  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_upload"     ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

-- ================================================================
-- Done! All tables, triggers, RLS policies, and storage ready.
-- ================================================================
