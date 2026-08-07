-- =============================================================================
--  Peakline Sports World — Supabase schema & security migration
-- =============================================================================
--
--  DEPLOYMENT CHECKLIST (run once, in order):
--
--  1. Run this whole file in the Supabase SQL editor. It is idempotent — safe
--     to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS throughout).
--
--  2. Create these STORAGE BUCKETS in the dashboard (Storage → New bucket):
--        team-logos            PUBLIC   (team logos are meant to be shown)
--        player-photos         PUBLIC   (player pictures are meant to be shown)
--        consent-forms         PRIVATE  (minors' documents — signed URL only)
--        proof-of-age          PRIVATE  (minors' documents — signed URL only)
--        receipts              PRIVATE  (payment receipts — signed URL only)
--        registration-receipts PUBLIC   (downloadable roster PDF)
--
--  3. Set these ENV VARS (see .env.example):
--        NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY  (client)
--        SUPABASE_SERVICE_ROLE_KEY                                (server only!)
--        ADMIN_PASSWORD_HASH, ADMIN_TOKEN                         (admin auth)
--
--  SECURITY MODEL
--  --------------
--  The public site talks to Supabase with the ANON key. The anon role can only
--  INSERT (registrations + players) and can never UPDATE, DELETE, or SELECT
--  their rows back. All reads and all status changes (approve/reject) happen
--  server-side through the SERVICE ROLE key, which bypasses RLS and is only
--  ever used inside /api/admin/* route handlers. There is no per-user auth for
--  registrants, so there are deliberately NO user-scoped SELECT policies.
-- =============================================================================


-- ----------------------------------------------------------------------------
--  Columns written by the registration flow (lib/api/registration.ts)
-- ----------------------------------------------------------------------------
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS consent_form_path TEXT,
  ADD COLUMN IF NOT EXISTS proof_of_age_path TEXT,
  ADD COLUMN IF NOT EXISTS jersey_number TEXT;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS payment_receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT;


-- ----------------------------------------------------------------------------
--  Enable Row Level Security (idempotent)
-- ----------------------------------------------------------------------------
ALTER TABLE tournaments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE players       ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
--  tournaments — public read (needed to resolve slug -> id during registration)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read tournaments" ON tournaments;
CREATE POLICY "Anyone can read tournaments"
  ON tournaments FOR SELECT
  USING (true);


-- ----------------------------------------------------------------------------
--  registrations
-- ----------------------------------------------------------------------------

-- INSERT: anyone may register, BUT they may not set an approved/rejected status.
-- This is the key guard — without the WITH CHECK, a malicious client could
-- INSERT a row already marked 'verified' and skip payment approval entirely.
DROP POLICY IF EXISTS "Anyone can insert registrations" ON registrations;
CREATE POLICY "Anyone can insert registrations"
  ON registrations FOR INSERT
  WITH CHECK (payment_status IN ('pending_upload', 'pending_verification'));

-- UPDATE: blocked for all clients. Approvals happen only via the service role.
DROP POLICY IF EXISTS "Block all client updates to registrations" ON registrations;
CREATE POLICY "Block all client updates to registrations"
  ON registrations FOR UPDATE
  USING (false);

-- DELETE: blocked for all clients.
DROP POLICY IF EXISTS "Block all client deletes on registrations" ON registrations;
CREATE POLICY "Block all client deletes on registrations"
  ON registrations FOR DELETE
  USING (false);

-- NOTE: intentionally NO SELECT policy. Registrants have no login, so the anon
-- role must not read registration rows back. The app generates the primary key
-- client-side (crypto.randomUUID) to avoid needing INSERT...RETURNING. Admin
-- reads go through the service role, which bypasses RLS.


-- ----------------------------------------------------------------------------
--  players
-- ----------------------------------------------------------------------------

-- INSERT: part of the public registration flow.
DROP POLICY IF EXISTS "Anyone can insert players" ON players;
CREATE POLICY "Anyone can insert players"
  ON players FOR INSERT
  WITH CHECK (true);

-- UPDATE: blocked for all clients.
DROP POLICY IF EXISTS "Block all client updates to players" ON players;
CREATE POLICY "Block all client updates to players"
  ON players FOR UPDATE
  USING (false);

-- DELETE: blocked for all clients.
DROP POLICY IF EXISTS "Block all client deletes on players" ON players;
CREATE POLICY "Block all client deletes on players"
  ON players FOR DELETE
  USING (false);

-- NOTE: intentionally NO SELECT policy (same reasoning as registrations).
