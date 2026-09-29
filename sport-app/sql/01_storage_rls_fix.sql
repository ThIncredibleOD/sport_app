-- =====================================================================
--  URGENT — run this in the Supabase SQL editor.
--
--  WHAT IS WRONG RIGHT NOW
--  Anyone holding the public anon key (it ships in the browser bundle of
--  every page — it is meant to be public) can list and download the
--  proof-of-age documents. Verified against production on 2026-09-29:
--
--    POST /storage/v1/object/list/proof-of-age   -> 200, 62 folders
--    GET  /storage/v1/object/proof-of-age/<path> -> 200, 74,265 bytes
--
--  Those are photographs of minors' identity documents.
--
--  The BUCKET setting is correct — `proof-of-age` has public = false, and
--  the unauthenticated URL /object/public/proof-of-age/<path> returns 400.
--  So this is not a bucket flag. It is a row-level-security policy on
--  storage.objects that grants the anon role SELECT. That table is never
--  touched by SUPABASE_MIGRATION.sql, which is why the problem outlived
--  every migration run so far.
--
--  WHAT THIS SCRIPT DOES
--  Reduces the browser to write-only. After this the anon role can still
--  upload (and re-upload on retry) but cannot read, list or delete
--  anything at all.
--
--  WHY REMOVING READ ACCESS IS SAFE
--  Every storage call in the app was enumerated before writing this:
--
--    anon (browser)  lib/api/registration.ts:383  .upload()       WRITE
--                    lib/api/registration.ts:407  .getPublicUrl() no network,
--                                                 it only builds a string
--
--    service_role    app/api/team/upload/route.ts
--    (server only,   app/api/team/add-player/route.ts
--     bypasses RLS   app/api/team/document-url/route.ts
--     entirely, so   app/api/admin/get-receipt-signed-url/route.ts
--     nothing below  app/api/admin/resolve-change/route.ts
--     affects it)    lib/team-data.ts
--
--  The three public buckets are still readable by the whole internet
--  through /object/public/... — that path checks the bucket flag only and
--  never consults RLS. What the browser loses is the ability to LIST them,
--  which it never used and which was quietly exposing a directory of every
--  player photo and receipt in the system.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Remove every existing policy on storage.objects.
--
-- Enumerated rather than dropped by name on purpose: the current policies
-- were created through the dashboard, their names are not in this repo,
-- and DROP POLICY IF EXISTS "<guess>" silently does nothing when the guess
-- is wrong — which would leave the leak open while appearing to succeed.
--
-- Dropping all of them is safe because service_role has BYPASSRLS (the
-- server keeps working regardless) and this app has no Supabase Auth
-- users, so no `authenticated` role policy is in use.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    RAISE NOTICE 'dropping storage.objects policy: %', pol.policyname;
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Let the browser upload, and nothing else.
-- ---------------------------------------------------------------------
CREATE POLICY "anon_insert_registration_uploads"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id IN (
      'team-logos',
      'player-photos',
      'registration-receipts',
      'proof-of-age'
    )
  );

-- UPDATE is required, not optional. lib/api/registration.ts:383 uploads
-- with `upsert: attempt > 1` — a retry may be re-sending a file whose
-- previous attempt actually landed before the connection dropped, and
-- without UPDATE that retry fails with "resource already exists". A full
-- team is 38 uploads over venue wifi; retries are routine, not an edge case.
CREATE POLICY "anon_update_registration_uploads"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (
    bucket_id IN (
      'team-logos',
      'player-photos',
      'registration-receipts',
      'proof-of-age'
    )
  )
  WITH CHECK (
    bucket_id IN (
      'team-logos',
      'player-photos',
      'registration-receipts',
      'proof-of-age'
    )
  );

-- Deliberately absent: any SELECT policy, and any DELETE policy.
-- Reads of proof-of-age happen server-side under service_role behind a
-- session check. Deletions happen there too.

COMMIT;

-- ---------------------------------------------------------------------
-- 3. Show the result.
-- ---------------------------------------------------------------------
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;
