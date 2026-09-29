-- =====================================================================
--  Run this in the Supabase SQL editor. It is the last storage step.
--
--  WHAT IS WRONG
--  storage.objects has INSERT policies and (since 01) no SELECT policy.
--  It has never had an UPDATE policy at all. Verified live 2026-09-29:
--
--    POST /storage/v1/object/team-logos/<path>                 -> 200
--    POST /storage/v1/object/team-logos/<path>  x-upsert:true  -> 403
--         {"error":"Unauthorized","message":
--          "new row violates row-level security policy"}
--
--    Same on player-photos and proof-of-age.
--
--  WHY THAT MATTERS AT THE VENUE
--  lib/api/registration.ts:394 uploads with `upsert: attempt > 1`. The
--  first attempt refuses to overwrite; a RETRY is allowed to, because a
--  retry may be re-sending a file whose previous attempt actually landed
--  before the connection dropped. That retry has never been able to
--  succeed.
--
--  It is worse than a failed retry. "row-level security" is on the
--  permanent-failure list in registration.ts:285, so the upload does not
--  even use its remaining attempts — it throws at once. And the
--  registration row is inserted BEFORE the players loop, so the team is
--  left in the database with only some of its players.
--
--  A full squad is 38 uploads over venue wifi. The code comment at
--  registration.ts:366 records this happening for real on 2026-08-23.
--
--  WHY IT IS SAFE
--  UPDATE on storage.objects replaces the bytes at a path the uploader
--  already created. Every path is namespaced under a freshly generated
--  registration UUID (registration.ts), so one team cannot address
--  another team's path, and a path that does not exist yet is an INSERT,
--  which is already governed separately.
--
--  This grants no read access. UPDATE is not SELECT: the anon role still
--  cannot list or download anything, which is what 01 was for.
-- =====================================================================

BEGIN;

-- Both USING and WITH CHECK are required and they are not the same test.
-- USING decides which existing rows anon is allowed to touch; WITH CHECK
-- decides what the row is allowed to look like afterwards. With only
-- USING, anon could move an object into a bucket it may not write.
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

COMMIT;

-- ---------------------------------------------------------------------
-- Confirm. Expected afterwards: the INSERT policies, this one UPDATE
-- policy, and exactly one SELECT policy — "Only admin can read
-- proof-of-age", which is inert (it tests auth.jwt()->>'role' = 'admin';
-- the anon key's JWT carries "role":"anon", and admin auth in this app is
-- a signed cookie, not a Supabase JWT). No other SELECT policy should
-- appear. If one does, the read leak is back.
-- ---------------------------------------------------------------------
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;
