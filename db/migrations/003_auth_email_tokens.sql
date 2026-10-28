-- Short-lived, single-use email tokens. Store only SHA-256 hashes, never raw tokens.
CREATE TABLE IF NOT EXISTS auth_email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email', 'sign_in')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_email_tokens_expiry_idx ON auth_email_tokens (expires_at);
CREATE INDEX IF NOT EXISTS auth_email_tokens_user_purpose_idx ON auth_email_tokens (user_id, purpose, expires_at DESC);