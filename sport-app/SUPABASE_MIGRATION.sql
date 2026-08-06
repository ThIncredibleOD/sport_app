-- ============================================================================
-- Supabase Migration for Security Fix + Player Photo Support
-- ============================================================================
-- Run this in the Supabase SQL Editor after creating the new bucket.
-- This aligns the database schema with the rewritten registration.ts code.

-- ----------------------------------------------------------------------------
-- 1. ADD NEW COLUMNS TO players TABLE
-- ----------------------------------------------------------------------------
-- The code now writes photo_url (public), consent_form_path, proof_of_age_path
-- (private paths, read via signed URLs) instead of the old *_url columns.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS consent_form_path TEXT,
  ADD COLUMN IF NOT EXISTS proof_of_age_path TEXT;

-- Optional: if you want to retire the old columns eventually, rename them:
-- ALTER TABLE players RENAME COLUMN consent_form_url TO consent_form_url_old;
-- ALTER TABLE players RENAME COLUMN proof_of_age_url TO proof_of_age_url_old;
-- Then drop them after confirming the new flow works:
-- ALTER TABLE players DROP COLUMN consent_form_url_old;
-- ALTER TABLE players DROP COLUMN proof_of_age_url_old;

-- ----------------------------------------------------------------------------
-- 2. ADD NEW COLUMN TO registrations TABLE
-- ----------------------------------------------------------------------------
-- The code now stores payment_receipt_path instead of payment_receipt_url.

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS payment_receipt_path TEXT;

-- Optional: retire the old column the same way:
-- ALTER TABLE registrations RENAME COLUMN payment_receipt_url TO payment_receipt_url_old;
-- ALTER TABLE registrations DROP COLUMN payment_receipt_url_old;

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES — CRITICAL FOR ANON-KEY SECURITY
-- ============================================================================
-- With the browser calling supabase.from(...).insert/update directly using the
-- anon key, RLS is the ONLY thing protecting your data. Without these policies,
-- anyone with the anon key (== anyone who can view-source your site) can:
--  - Read all registrations/players (including minors' DOB, contact info)
--  - Update payment_status to "verified" and bypass manual approval
--  - Delete records
--
-- The policies below implement:
--  - Public INSERT (anyone can register)
--  - NO client UPDATE to payment_status (only admin via service_role can approve)
--  - NO client DELETE
--  - SELECT restricted (authenticated users see only their own; admin sees all)
--
-- Adjust to fit your auth model. If you have no Supabase Auth login for users,
-- make SELECT permissive or remove it (knowing anyone with the anon key can read).

-- ----------------------------------------------------------------------------
-- 3a. Enable RLS on all three tables
-- ----------------------------------------------------------------------------
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3b. TOURNAMENTS — read-only for clients
-- ----------------------------------------------------------------------------
-- Anyone can SELECT tournament info (needed to look up tournament_id by slug).
CREATE POLICY "Anyone can read tournaments"
  ON tournaments FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE from the client (tournaments managed via dashboard/admin)
-- (RLS denies by default when no policy matches, so no explicit DENY needed)

-- ----------------------------------------------------------------------------
-- 3c. REGISTRATIONS — insert allowed, payment_status NOT updatable by client
-- ----------------------------------------------------------------------------

-- Anyone can INSERT a new registration (public registration flow)
CREATE POLICY "Anyone can insert registrations"
  ON registrations FOR INSERT
  WITH CHECK (true);

-- CRITICAL: Block ALL client UPDATEs to prevent self-approval.
-- The only safe way to approve payments is via a server route (API route, Edge
-- Function, etc.) that uses the SERVICE_ROLE key, never the anon key.
CREATE POLICY "Block all client updates to registrations"
  ON registrations FOR UPDATE
  USING (false);

-- Optional: if you implement user auth and want users to update their OWN
-- registration BEFORE payment (e.g., edit contact info), use this instead:
-- CREATE POLICY "Users can update their own registrations (excluding payment_status)"
--   ON registrations FOR UPDATE
--   USING (auth.uid() = user_id)  -- assumes you add a user_id column linking to auth.users
--   WITH CHECK (
--     auth.uid() = user_id
--     AND (NEW.payment_status = OLD.payment_status)  -- payment_status cannot change
--   );

-- SELECT: authenticated users can read their own; admin role can read all.
-- If you have NO user auth, you may want to make this permissive (USING true)
-- knowing anyone with the anon key can read all registrations.
CREATE POLICY "Users can read their own registrations"
  ON registrations FOR SELECT
  USING (
    auth.uid() = user_id  -- assumes you add a user_id column
    OR auth.jwt() ->> 'role' = 'admin'  -- admin can see all
  );

-- No DELETE from client
CREATE POLICY "Block all client deletes on registrations"
  ON registrations FOR DELETE
  USING (false);

-- ----------------------------------------------------------------------------
-- 3d. PLAYERS — same pattern as registrations
-- ----------------------------------------------------------------------------

-- Anyone can INSERT players (part of the registration flow)
CREATE POLICY "Anyone can insert players"
  ON players FOR INSERT
  WITH CHECK (true);

-- Block ALL client UPDATEs
CREATE POLICY "Block all client updates to players"
  ON players FOR UPDATE
  USING (false);

-- SELECT: users can read their own team's players; admin can read all
-- (Assumes you add a way to link players -> registrations -> user_id)
CREATE POLICY "Users can read their own players"
  ON players FOR SELECT
  USING (
    registration_id IN (
      SELECT id FROM registrations WHERE user_id = auth.uid()
    )
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- No DELETE from client
CREATE POLICY "Block all client deletes on players"
  ON players FOR DELETE
  USING (false);

-- ============================================================================
-- 4. STORAGE BUCKET RLS (if applicable)
-- ============================================================================
-- The code now uses these buckets:
--  - team-logos (PUBLIC)
--  - player-photos (PUBLIC) — NEW
--  - consent-forms (PRIVATE)
--  - proof-of-age (PRIVATE)
--  - receipts (PRIVATE)
--
-- Public buckets: anyone can upload and read (already handled by "public" flag)
-- Private buckets: RLS on storage.objects table controls access. Example:

-- Allow uploads to private buckets (consent-forms, proof-of-age, receipts):
-- CREATE POLICY "Anyone can upload to consent-forms"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'consent-forms');

-- CREATE POLICY "Anyone can upload to proof-of-age"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'proof-of-age');

-- CREATE POLICY "Anyone can upload to receipts"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'receipts');

-- Restrict SELECT to admin only (for reviewing documents):
-- CREATE POLICY "Only admin can read consent-forms"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'consent-forms'
--     AND auth.jwt() ->> 'role' = 'admin'
--   );

-- CREATE POLICY "Only admin can read proof-of-age"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'proof-of-age'
--     AND auth.jwt() ->> 'role' = 'admin'
--   );

-- CREATE POLICY "Only admin can read receipts"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'receipts'
--     AND auth.jwt() ->> 'role' = 'admin'
--   );

-- ============================================================================
-- VERIFICATION CHECKLIST (run these queries after applying the migration)
-- ============================================================================

-- 1. Confirm new columns exist:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'players'
--   AND column_name IN ('photo_url', 'consent_form_path', 'proof_of_age_path');

-- 2. Confirm RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   AND tablename IN ('tournaments', 'registrations', 'players');
-- (rowsecurity should be 't' for all three)

-- 3. List active policies:
-- SELECT tablename, policyname, cmd, qual FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;

-- 4. Test with anon key (from browser console with supabase-js):
--   Try to UPDATE payment_status — should be blocked by RLS
--   const { error } = await supabase
--     .from('registrations')
--     .update({ payment_status: 'verified' })
--     .eq('id', 'some-id');
--   console.log(error);  // should see permission denied

-- ============================================================================
