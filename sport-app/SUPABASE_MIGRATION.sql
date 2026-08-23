-- =============================================================================
--  Peakline Sports World — Supabase schema & security migration
-- =============================================================================
--
--  Idempotent: safe to re-run. Run the WHOLE file in the Supabase SQL editor.
--  The last statement prints the resulting policy set so you can eyeball it.
--
--  -------------------------------------------------------------------------
--  DASHBOARD ACTIONS THIS FILE CANNOT PERFORM (Storage → bucket → Settings)
--  -------------------------------------------------------------------------
--  Bucket MIME allow-lists are not reachable from SQL. Verified live on
--  2026-08-23, the buckets were configured as:
--
--     proof-of-age           application/pdf ONLY   <-- BLOCKS REGISTRATION
--     team-logos             jpeg, png  (webp rejected)
--     player-photos          jpeg, png  (webp rejected)
--     registration-receipts  application/pdf        OK
--
--  proof_of_age is REQUIRED for every player, and a photographed birth
--  certificate arrives as an image, so with a pdf-only allow-list every
--  registration fails on its first player. Set each bucket's allowed MIME
--  types to:
--
--     proof-of-age           image/jpeg, image/png, image/webp, application/pdf
--     team-logos             image/jpeg, image/png, image/webp
--     player-photos          image/jpeg, image/png, image/webp
--     registration-receipts  application/pdf
--
--  Also set each bucket's per-object size limit to at least 200KB. The app
--  compresses to ~110KB and hard-rejects over 120KB (lib/images.ts), so the
--  bucket limit should sit ABOVE the app's — the app can explain a rejection,
--  storage just returns a raw API error.
--
--  Bucket visibility (unchanged, deliberate):
--     team-logos            PUBLIC   team logos are meant to be shown
--     player-photos         PUBLIC   player + coach headshots are meant to be shown
--     registration-receipts PUBLIC   downloadable roster PDF
--     proof-of-age          PRIVATE  minors' documents — signed URL only
--     consent-forms         PRIVATE  legacy, no longer written
--     receipts              PRIVATE  legacy, no longer written
--
--  -------------------------------------------------------------------------
--  ENV VARS (.env.local locally; Vercel → Settings → Environment Variables
--  for production — Vercel only applies env changes to NEW deployments, so
--  redeploy after any change)
--  -------------------------------------------------------------------------
--     NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY  (client)
--     SUPABASE_SERVICE_ROLE_KEY                                (server only!)
--     ADMIN_PASSWORD_HASH_B64, ADMIN_TOKEN                     (admin auth)
--
--  -------------------------------------------------------------------------
--  SECURITY MODEL
--  -------------------------------------------------------------------------
--  The public site talks to Supabase with the ANON key, which ships inside the
--  client bundle and must therefore be treated as public knowledge. The anon
--  role may do exactly two things: read `tournaments`, and INSERT into
--  `registrations` / `players`. It may never SELECT, UPDATE or DELETE a
--  registration. Every read and every status change happens server-side with
--  the SERVICE ROLE key, which bypasses RLS and is used only inside
--  /api/admin/* route handlers. Registrants have no login, so there are
--  deliberately NO user-scoped SELECT policies.
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
  ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS coach_photo_url TEXT;

-- NOTE: players.consent_form_path and registrations.payment_receipt_path are
-- LEGACY. They are no longer written, but are deliberately NOT dropped:
-- historical rows still reference them and an unused nullable TEXT column costs
-- nothing. Dropping them is a one-way door.


-- ----------------------------------------------------------------------------
--  Legacy NOT NULL columns on players  <-- SECOND HARD BLOCKER
-- ----------------------------------------------------------------------------
-- An older schema stored these two as `_url` (a public URL). The app now stores
-- proof of age as `proof_of_age_path` (a PRIVATE path, signed on demand) and
-- collects no consent form at all — so it writes NEITHER of these columns.
--
-- They were still NOT NULL live, which made EVERY player INSERT fail with
--   null value in column "consent_form_url" violates not-null constraint
-- The registration row would commit and then the first player would throw,
-- leaving a team with zero players.
--
-- Made nullable rather than dropped: dropping is irreversible and these columns
-- may hold data for historical rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players'
      AND column_name = 'consent_form_url' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.players ALTER COLUMN consent_form_url DROP NOT NULL;
    RAISE NOTICE 'players.consent_form_url is now nullable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'players'
      AND column_name = 'proof_of_age_url' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.players ALTER COLUMN proof_of_age_url DROP NOT NULL;
    RAISE NOTICE 'players.proof_of_age_url is now nullable';
  END IF;
END $$;


-- ----------------------------------------------------------------------------
--  payment_status domain — TABLE CHECK constraint
-- ----------------------------------------------------------------------------
-- Unlike the RLS policies further down, this is a table constraint, so it
-- applies to the SERVICE ROLE as well and is not bypassed by it.
--
-- The column name is historical. Nothing about money is tracked anywhere in the
-- app any more — it is simply the row's state:
--
--   * 'pending_payment' — registered. The state every new row is inserted in.
--   * 'rejected'        — cancelled, via /api/admin/cancel-registration.
--                         Reversible with /api/admin/restore-registration.
--
-- This CHECK is deliberately WIDER than the INSERT policy below: it defines
-- every value a row is allowed to hold (including legacy values on historical
-- rows), whereas the policy defines the single value anon may create.
ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_payment_status_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_payment_status_check
  CHECK (payment_status IN (
    'pending_payment',      -- registered (the state every new row starts in)
    'rejected',             -- cancelled / withdrawn
    'verified',             -- unused by the app; kept available
    'pending_upload',       -- legacy (off-site bank transfer)
    'pending_verification'  -- legacy (off-site bank transfer)
  ));


-- ----------------------------------------------------------------------------
--  Enable Row Level Security (idempotent)
-- ----------------------------------------------------------------------------
ALTER TABLE tournaments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE players       ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
--  Drop EVERY existing policy on these tables  <-- WHY THE LEAKS SURVIVED
-- ----------------------------------------------------------------------------
-- Postgres RLS is permissive-OR: if ANY policy allows an operation, it is
-- allowed. Adding a `USING (false)` policy therefore does not override a
-- permissive one sitting beside it — and `DROP POLICY IF EXISTS "<name>"` only
-- removes a policy with that EXACT name, so policies created earlier under
-- names this file never knew about survived every re-run.
--
-- Verified live on 2026-08-23, that is exactly what had happened: with the
-- anon key alone it was possible to
--   * SELECT registrations  — every contact name, phone and email readable
--   * UPDATE registrations  — rewrite or self-approve any team's entry
--   * INSERT a row already marked 'verified'
-- despite this file defining no SELECT policy and a `USING (false)` UPDATE one.
--
-- So: enumerate and drop them all, then rebuild the intended set from scratch.
-- This is the only reliable way to know what is actually in force.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('tournaments', 'registrations', 'players')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'dropped pre-existing policy "%" on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
--  tournaments — public read (needed to resolve slug -> id during registration)
-- ----------------------------------------------------------------------------
CREATE POLICY "Anyone can read tournaments"
  ON tournaments FOR SELECT
  USING (true);


-- ----------------------------------------------------------------------------
--  registrations — anon may INSERT and nothing else
-- ----------------------------------------------------------------------------

-- INSERT: anyone may register, but only into the one state the app uses. The
-- WITH CHECK is the guard that stops a client inserting a row already marked
-- 'verified'. Pinned to a single value rather than a list: the app has exactly
-- one insert path (lib/api/registration.ts) and it always writes
-- 'pending_payment', so anything else is either stale or hostile.
CREATE POLICY "Anyone can insert registrations"
  ON registrations FOR INSERT
  WITH CHECK (payment_status = 'pending_payment');

-- No SELECT policy, by design. Registrants have no login, so the anon role must
-- not read registration rows back — they hold contact names, phone numbers and
-- email addresses. The app never needs it: the primary key is generated
-- client-side (crypto.randomUUID) precisely so the INSERT does not have to
-- RETURN anything. Admin reads use the service role, which bypasses RLS.

-- No UPDATE or DELETE policy, by design. With every policy dropped above and
-- none created here, both are denied outright — which is strictly stronger than
-- a `USING (false)` policy, since that only fails to grant and cannot revoke
-- what another permissive policy grants. Cancel/restore run through the service
-- role inside /api/admin/*.


-- ----------------------------------------------------------------------------
--  players — anon may INSERT and nothing else
-- ----------------------------------------------------------------------------

-- INSERT: part of the public registration flow. No column needs constraining
-- here; players carry no status the admin controls.
CREATE POLICY "Anyone can insert players"
  ON players FOR INSERT
  WITH CHECK (true);

-- No SELECT policy, by design — player rows carry minors' names, dates of birth
-- and the private storage path of their proof-of-age document.
-- No UPDATE or DELETE policy, by design (same reasoning as registrations).


-- ============================================================================
--  VERIFICATION — this prints the final policy set. Expect exactly 3 rows:
--
--    players        Anyone can insert players        INSERT   with_check: true
--    registrations  Anyone can insert registrations  INSERT   with_check: (payment_status = 'pending_payment')
--    tournaments    Anyone can read tournaments      SELECT   qual: true
--
--  Any additional row is a policy this file did not create — investigate it.
-- ============================================================================
SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('tournaments', 'registrations', 'players')
 ORDER BY tablename, cmd, policyname;
