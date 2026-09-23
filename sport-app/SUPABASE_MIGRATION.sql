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
  ADD COLUMN IF NOT EXISTS jersey_number TEXT,
  ADD COLUMN IF NOT EXISTS height_cm TEXT,
  ADD COLUMN IF NOT EXISTS preferred_foot TEXT;

-- height_cm and preferred_foot are collected by the Unity Cup form only; rows
-- from the other cups leave them NULL. TEXT rather than INTEGER, following
-- jersey_number: the insert path is shared by all three cups, and a TEXT column
-- cannot fail an insert the way an integer would on a stray non-numeric value.
--
-- RUN THIS BEFORE DEPLOYING THE CODE THAT WRITES THEM. lib/api/registration.ts
-- has one insert path for every cup, so a missing column here fails EVERY
-- registration, not just Unity's.

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS payment_receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS coach_photo_url TEXT;

-- NOTE: players.consent_form_path and registrations.payment_receipt_path are
-- LEGACY. They are no longer written, but are deliberately NOT dropped:
-- historical rows still reference them and an unused nullable TEXT column costs
-- nothing. Dropping them is a one-way door.


-- ----------------------------------------------------------------------------
--  REGISTRATION WINDOW — which tournaments still accept new entries
-- ----------------------------------------------------------------------------
-- Closing a tournament has two halves, and both should be done:
--
--   1. lib/tournaments.ts  `registrationOpen: false`  — the app-level gate.
--      Closes the button on /register, every step page (including deep links)
--      and the submit call. This is what every real team hits.
--
--   2. this column + the INSERT policy below — the hard gate. The anon key is
--      in the client bundle and is public knowledge, so the app-level gate is
--      not a security boundary; this is. With the flag false, Postgres itself
--      refuses the INSERT no matter what is talking to it.
--
-- DEFAULT TRUE so that running this file never silently closes a tournament
-- that should be open. NOT NULL so the policy's `t.registration_open` is never
-- NULL — in an RLS WITH CHECK, NULL is not true, and a tournament would become
-- unregisterable for a reason nothing on screen would explain.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN NOT NULL DEFAULT TRUE;

-- Close the U16 league; leave the other two open. Written as an explicit pair
-- rather than one UPDATE so re-running this file always restores the intended
-- state, even if somebody flipped a flag by hand in the dashboard.
UPDATE tournaments SET registration_open = FALSE WHERE slug =  'u16-league';
UPDATE tournaments SET registration_open = TRUE  WHERE slug IN ('secondary-cup', 'unity-cup');


-- ----------------------------------------------------------------------------
--  Team officials besides the head coach
-- ----------------------------------------------------------------------------
-- The form collects a team manager, an assistant coach and two medics alongside
-- the head coach (app/register/*/{team-manager,assistant-coach,medics}).
--
-- EVERY column here is nullable, on purpose. Registration is typed in at the
-- venue with a queue waiting, and a team that turns up without an assistant
-- coach or a second medic must still be submittable — so an official nobody
-- entered is written as four NULLs. Note DATE, not TEXT: the app funnels every
-- one of these through a helper that converts "" to NULL, because a `date`
-- column rejects an empty string outright.
--
-- Flat columns mirroring the existing coach_* ones rather than a child table,
-- which means no new RLS policy is needed: the anon INSERT policy on
-- registrations constrains only payment_status, so it already covers these.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS manager_full_name           TEXT,
  ADD COLUMN IF NOT EXISTS manager_dob                 DATE,
  ADD COLUMN IF NOT EXISTS manager_nationality         TEXT,
  ADD COLUMN IF NOT EXISTS manager_photo_url           TEXT,
  ADD COLUMN IF NOT EXISTS assistant_coach_full_name   TEXT,
  ADD COLUMN IF NOT EXISTS assistant_coach_dob         DATE,
  ADD COLUMN IF NOT EXISTS assistant_coach_nationality TEXT,
  ADD COLUMN IF NOT EXISTS assistant_coach_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS medic1_full_name            TEXT,
  ADD COLUMN IF NOT EXISTS medic1_dob                  DATE,
  ADD COLUMN IF NOT EXISTS medic1_nationality          TEXT,
  ADD COLUMN IF NOT EXISTS medic1_photo_url            TEXT,
  ADD COLUMN IF NOT EXISTS medic2_full_name            TEXT,
  ADD COLUMN IF NOT EXISTS medic2_dob                  DATE,
  ADD COLUMN IF NOT EXISTS medic2_nationality          TEXT,
  ADD COLUMN IF NOT EXISTS medic2_photo_url            TEXT;

-- The officials' headshots go to the EXISTING player-photos bucket with a
-- manager_/assistant_/medic1_/medic2_ filename prefix, exactly as the coach
-- headshot already does — so this needs no bucket work in the dashboard.


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

-- INSERT: anyone may register, but only into the one state the app uses, and
-- only into a tournament that is still open. The WITH CHECK is the guard that
-- stops a client inserting a row already marked 'verified'. Pinned to a single
-- value rather than a list: the app has exactly one insert path
-- (lib/api/registration.ts) and it always writes 'pending_payment', so anything
-- else is either stale or hostile.
--
-- The EXISTS clause is the hard half of closing a tournament. The app-level
-- gate (lib/tournaments.ts) stops every route a browser can take, which covers
-- every real team; this stops the anon key itself, which ships in the client
-- bundle and is public knowledge. The subquery reads `tournaments`, which anon
-- may SELECT under the policy above, so it evaluates normally.
CREATE POLICY "Anyone can insert registrations"
  ON registrations FOR INSERT
  WITH CHECK (
    payment_status = 'pending_payment'
    AND EXISTS (
      SELECT 1 FROM tournaments t
       WHERE t.id = registrations.tournament_id
         AND t.registration_open
    )
  );

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
--  TEAM SELF-SERVICE PORTAL  (app/team/*, /api/team/*)
-- ============================================================================
--  Teams log in with their reference + the phone number they registered with,
--  and correct their own details. Photos and contact details apply instantly.
--  Anything that establishes WHO A PLAYER IS — name, date of birth,
--  nationality, proof-of-age document — is queued for the organiser instead,
--  because this is an age-restricted tournament and a silently editable date of
--  birth would make the eligibility check meaningless.
--
--  Neither table below gets a policy. RLS is enabled and left empty, so the
--  anon role cannot touch either one: `pending_changes` holds minors' names and
--  dates of birth, and `team_login_attempts` would otherwise let anyone read or
--  forge the rate-limit ledger that protects login. Both are reached only by
--  the service role inside /api/team/* and /api/admin/*.
-- ----------------------------------------------------------------------------

-- A change a team has asked for that the organiser has not yet resolved.
--
-- old_value is kept so the admin screen can show what it is replacing, and so a
-- rejection has something to revert to. For a proof-of-age replacement,
-- new_value holds a STORAGE PATH under `<regId>/pending/<changeId>` rather than
-- a literal value: the new document is uploaded immediately but does not become
-- the player's document until approval moves it to the canonical path.
CREATE TABLE IF NOT EXISTS pending_changes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  -- NULL means the field lives on `registrations` (contact details, officials).
  player_id       UUID REFERENCES players(id) ON DELETE CASCADE,
  field           TEXT NOT NULL,
  old_value       TEXT,
  new_value       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  -- Set when the team has seen and dismissed the "could not be applied" note.
  -- Only ever set on rejected rows; approved ones are never announced.
  dismissed_at    TIMESTAMPTZ
);

-- The admin queue reads pending rows newest-first; the team page reads its own
-- rows on every load. Both are covered here.
CREATE INDEX IF NOT EXISTS pending_changes_status_idx
  ON pending_changes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS pending_changes_registration_idx
  ON pending_changes (registration_id, status);

-- Login ledger, for rate limiting. Vercel runs several lambdas, so an
-- in-process counter would reset unpredictably and count only a fraction of
-- attempts — this has to be shared state.
CREATE TABLE IF NOT EXISTS team_login_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The reference TYPED IN, which on a failed attempt may match no real team.
  -- Deliberately not a foreign key for that reason.
  reference    TEXT,
  ip           TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  succeeded    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS team_login_attempts_reference_idx
  ON team_login_attempts (reference, attempted_at DESC);
CREATE INDEX IF NOT EXISTS team_login_attempts_ip_idx
  ON team_login_attempts (ip, attempted_at DESC);

ALTER TABLE pending_changes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_login_attempts  ENABLE ROW LEVEL SECURITY;

-- Same defensive sweep as above: drop whatever policies exist on these two
-- before asserting that they have none, so a policy added by hand in the
-- dashboard cannot quietly survive a re-run of this file.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('pending_changes', 'team_login_attempts')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'dropped pre-existing policy "%" on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;


-- ============================================================================
--  VERIFICATION — this prints the final policy set. Expect exactly 3 rows:
--
--    players        Anyone can insert players        INSERT   with_check: true
--    registrations  Anyone can insert registrations  INSERT   with_check: ((payment_status = 'pending_payment') AND (EXISTS (SELECT 1 FROM tournaments t WHERE ((t.id = registrations.tournament_id) AND t.registration_open))))
--    tournaments    Anyone can read tournaments      SELECT   qual: true
--
--  pending_changes and team_login_attempts must print NOTHING — they are
--  service-role only. A row for either one is a policy this file did not
--  create; investigate it.
--
--  Any additional row is a policy this file did not create — investigate it.
-- ============================================================================
SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('tournaments', 'registrations', 'players',
                     'pending_changes', 'team_login_attempts')
 ORDER BY tablename, cmd, policyname;
