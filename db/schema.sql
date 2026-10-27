-- Linkwell PostgreSQL schema (Neon)
-- Apply this migration only to the intended database after reviewing it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('talent', 'employer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('full_time', 'part_time', 'freelance', 'contract');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE work_arrangement AS ENUM ('remote', 'hybrid', 'on_site');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('submitted', 'reviewing', 'shortlisted', 'rejected', 'withdrawn', 'hired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider_id text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'talent',
  email_verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS talent_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline text,
  biography text,
  location text,
  skills text[] NOT NULL DEFAULT '{}',
  portfolio_url text,
  cv_object_key text,
  profile_visibility boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  website_url text,
  description text,
  logo_object_key text,
  location text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_user_id uuid NOT NULL REFERENCES employer_profiles(user_id) ON DELETE RESTRICT,
  title text NOT NULL,
  company_name text NOT NULL,
  description text NOT NULL,
  requirements text,
  category text NOT NULL,
  listing_type listing_type NOT NULL,
  work_arrangement work_arrangement NOT NULL DEFAULT 'remote',
  location text,
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  salary_currency char(3),
  salary_period text,
  application_url text,
  status listing_status NOT NULL DEFAULT 'draft',
  review_reason text,
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (salary_min IS NULL OR salary_min >= 0),
  CHECK (salary_max IS NULL OR salary_max >= 0),
  CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min),
  CHECK (status <> 'published' OR (published_at IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS jobs_public_search_idx ON jobs (status, published_at DESC);
CREATE INDEX IF NOT EXISTS jobs_type_idx ON jobs (listing_type, work_arrangement, status);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  talent_user_id uuid NOT NULL REFERENCES talent_profiles(user_id) ON DELETE CASCADE,
  cover_letter text,
  cv_object_key text,
  status application_status NOT NULL DEFAULT 'submitted',
  employer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, talent_user_id)
);
CREATE INDEX IF NOT EXISTS applications_talent_idx ON applications (talent_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS applications_job_idx ON applications (job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saved_jobs (
  talent_user_id uuid NOT NULL REFERENCES talent_profiles(user_id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (talent_user_id, job_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_user_id uuid NOT NULL REFERENCES employer_profiles(user_id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  plan_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_user_id uuid NOT NULL REFERENCES employer_profiles(user_id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_reference text NOT NULL UNIQUE,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency char(3) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON admin_audit_logs (created_at DESC);

-- Application authorization is enforced by server-side application code and verified auth claims.
-- Never expose this database using an unrestricted client-side connection string.

-- Database-level guardrails: published listings must have review metadata.
-- Editing a live listing's material content automatically returns it to review.
CREATE OR REPLACE FUNCTION linkwell_guard_job_publication()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'published'
     AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.company_name IS DISTINCT FROM OLD.company_name OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.requirements IS DISTINCT FROM OLD.requirements OR
       NEW.category IS DISTINCT FROM OLD.category OR
       NEW.listing_type IS DISTINCT FROM OLD.listing_type OR
       NEW.work_arrangement IS DISTINCT FROM OLD.work_arrangement OR
       NEW.location IS DISTINCT FROM OLD.location OR
       NEW.salary_min IS DISTINCT FROM OLD.salary_min OR
       NEW.salary_max IS DISTINCT FROM OLD.salary_max OR
       NEW.salary_currency IS DISTINCT FROM OLD.salary_currency OR
       NEW.salary_period IS DISTINCT FROM OLD.salary_period OR
       NEW.application_url IS DISTINCT FROM OLD.application_url
     ) THEN
    NEW.status := 'pending_review';
    NEW.submitted_at := now();
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.review_reason := NULL;
    NEW.published_at := NULL;
  END IF;

  IF NEW.status = 'published' AND (
    NEW.reviewed_at IS NULL OR NEW.reviewed_by IS NULL OR NEW.published_at IS NULL
  ) THEN
    RAISE EXCEPTION 'A listing must be reviewed before publication';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_guard_publication ON jobs;
CREATE TRIGGER jobs_guard_publication
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION linkwell_guard_job_publication();
