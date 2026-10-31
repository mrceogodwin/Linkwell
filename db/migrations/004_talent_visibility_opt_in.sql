-- Privacy: talent profiles must be explicitly made discoverable.
-- Existing profiles are made private so users can opt in deliberately.
ALTER TABLE talent_profiles
  ALTER COLUMN profile_visibility SET DEFAULT false;

UPDATE talent_profiles
SET profile_visibility = false
WHERE profile_visibility IS DISTINCT FROM false;
