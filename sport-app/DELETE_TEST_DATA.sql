-- ============================================================================
--  Remove a test registration
-- ============================================================================
--  Paste into the Supabase SQL editor. Run STEP 1 first and read what it lists
--  before running anything that deletes.
--
--  Pick ONE way to identify the row and use it consistently in every step:
--
--    by reference  -> id::text LIKE 'e2d3955a%'      (the 8-char code on the
--                                                     confirmation page and the
--                                                     summary PDF, LOWERCASED)
--    by academy    -> academy_name ILIKE '%ZZ TEST%'
--
--  The examples below match on academy name, which is the safer one for test
--  data: real teams will never be called "ZZ TEST".
--
--  NOTE ON FILES: deleting rows from storage.objects (step 4) removes the file
--  listings, but the uploaded bytes stay behind, orphaned, in the storage
--  backend. To delete files properly use Storage in the dashboard, or run
--    node --env-file=.env.local scripts/delete-registration.mjs <REF> --yes
--  which does the rows and the files together and then verifies both are gone.
-- ============================================================================


-- STEP 1 — SEE WHAT YOU'RE ABOUT TO DELETE. Deletes nothing.
SELECT r.id,
       upper(left(r.id::text, 8)) AS reference,
       r.academy_name,
       r.contact_name,
       r.payment_status,
       r.created_at,
       count(p.id)                AS players
FROM registrations r
LEFT JOIN players p ON p.registration_id = r.id
WHERE r.academy_name ILIKE '%ZZ TEST%'
GROUP BY r.id
ORDER BY r.created_at DESC;


-- STEP 2 — the player rows. Must go before step 3: players.registration_id
-- references registrations.id, so the parent can't be deleted while they exist.
DELETE FROM players
WHERE registration_id IN (
  SELECT id FROM registrations WHERE academy_name ILIKE '%ZZ TEST%'
);


-- STEP 3 — the registration itself.
DELETE FROM registrations
WHERE academy_name ILIKE '%ZZ TEST%';


-- STEP 4 — the file listings, if you want them out of the object index too.
-- Every upload is namespaced under the registration's UUID, so one prefix match
-- per bucket catches all of a team's files. Replace the UUID with the `id` that
-- step 1 printed — run this BEFORE step 3, or note the id down first, because
-- once the registration row is gone you can't look it up any more.
DELETE FROM storage.objects
WHERE bucket_id IN (
        'team-logos', 'player-photos', 'proof-of-age', 'registration-receipts'
      )
  AND name LIKE 'PASTE-REGISTRATION-UUID-HERE/%';


-- STEP 5 — confirm nothing is left.
SELECT (SELECT count(*) FROM registrations WHERE academy_name ILIKE '%ZZ TEST%')
         AS registrations_left,
       (SELECT count(*) FROM storage.objects
        WHERE name LIKE 'PASTE-REGISTRATION-UUID-HERE/%')
         AS files_left;
