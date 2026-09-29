-- =====================================================================
--  Data integrity for `players`. Run AFTER 01_storage_rls_fix.sql.
--
--  Everything in PART 1 and PART 2 is mechanical and reversible in
--  meaning — whitespace, capitalisation, and rules that only apply to
--  rows entered from now on. Nothing here deletes a row or invents a
--  value.
--
--  PART 3 is a REVIEW LIST, not a fix. It prints the rows only you can
--  judge. Deliberately no UPDATE: I cannot know a child's real birthday,
--  and guessing one into a tournament's age-eligibility record would be
--  worse than leaving it visibly wrong.
-- =====================================================================


-- =====================================================================
-- PART 1 — normalise what is unambiguous.
-- =====================================================================
BEGIN;

-- 1a. Nationality is stored ten different ways for one country:
--     "Nigerian " 341, "Nigerian" 316, "Nigeria " 110, "NIGERIAN" 70,
--     "Nigeria" 60, "NIGERIA " 53, "NIGERIA" 23, "NGERIA " 1,
--     "nigeria" 1, "NIGERA" 1.
--     Grouping or filtering by nationality is meaningless until this is
--     one value. The column is `nationality`, so the canonical form is
--     the demonym: "Nigerian".
UPDATE players
SET nationality = 'Nigerian'
WHERE nationality IS NOT NULL
  AND upper(regexp_replace(trim(nationality), '\s+', ' ', 'g'))
      IN ('NIGERIAN', 'NIGERIA', 'NGERIA', 'NIGERA', 'NIGERIAN.', 'NAIJA');

-- Anything else: collapse internal runs of whitespace, trim the ends, and
-- capitalise the first letter. Leaves genuinely foreign nationalities
-- intact instead of forcing them to Nigerian.
UPDATE players
SET nationality = initcap(regexp_replace(trim(nationality), '\s+', ' ', 'g'))
WHERE nationality IS NOT NULL
  AND nationality <> initcap(regexp_replace(trim(nationality), '\s+', ' ', 'g'));

-- 1b. Position has three spellings of one value: "Goalkeeper" 88,
--     "GOALKEEPER" 1, "GK" 1 — plus one empty string.
UPDATE players
SET position = 'Goalkeeper'
WHERE upper(trim(position)) IN ('GOALKEEPER', 'GK', 'KEEPER');

UPDATE players
SET position = initcap(trim(position))
WHERE position IS NOT NULL
  AND trim(position) <> ''
  AND position <> initcap(trim(position));

-- 1c. Trailing spaces on typed-in names ("Jonah Sunday ", "Dada KAYODE ").
--     Names keep their capitalisation — initcap would mangle "O'Brien" and
--     is not ours to impose. Only the whitespace goes.
UPDATE players
SET full_name = regexp_replace(trim(full_name), '\s+', ' ', 'g')
WHERE full_name IS NOT NULL
  AND full_name <> regexp_replace(trim(full_name), '\s+', ' ', 'g');

UPDATE registrations
SET academy_name = regexp_replace(trim(academy_name), '\s+', ' ', 'g')
WHERE academy_name IS NOT NULL
  AND academy_name <> regexp_replace(trim(academy_name), '\s+', ' ', 'g');

-- 1d. An empty string is not a value. Make the optional ones NULL so the
--     "is this filled in" checks in the app and the database agree.
--
--     `position` is NOT in this list on purpose: the column is NOT NULL, so
--     setting it to NULL would abort the transaction. Exactly one row has
--     position = '' — the "NOT APPLICABLE" placeholder in SPORTING HOTSPUR's
--     unity-cup squad — and an empty string is the only way that column can
--     express "blank". The constraint in PART 2 stops new ones; this row is
--     left alone rather than given a position it does not have.
UPDATE players SET jersey_number  = NULL WHERE trim(jersey_number) = '';
UPDATE players SET preferred_foot = NULL WHERE trim(preferred_foot) = '';
UPDATE players SET height_cm      = NULL WHERE trim(height_cm) = '';

COMMIT;


-- =====================================================================
-- PART 2 — stop new junk arriving.
--
-- Every constraint is NOT VALID. That is intentional and it is the whole
-- point: NOT VALID applies to every INSERT and UPDATE from now on but
-- does NOT re-check the 976 rows already there. Without it these
-- statements would simply fail against real data (42 players have a
-- height in feet) and you would end up with no protection at all.
--
-- Validate one later, once its review list in PART 3 is cleared, with:
--   ALTER TABLE players VALIDATE CONSTRAINT players_height_cm_sane;
-- =====================================================================
BEGIN;

-- Height is TEXT holding centimetres. "5.6" is a man 5.6cm tall; it is
-- someone's height in FEET, and 42 rows have one. The browser now refuses
-- it (app/register/unity-cup/players/page.tsx) — this is the backstop,
-- because the anon key can POST to /rest/v1/players directly.
ALTER TABLE players
  ADD CONSTRAINT players_height_cm_sane
  CHECK (
    height_cm IS NULL
    OR (height_cm ~ '^\d{2,3}$' AND height_cm::int BETWEEN 100 AND 250)
  ) NOT VALID;

ALTER TABLE players
  ADD CONSTRAINT players_jersey_number_sane
  CHECK (
    jersey_number IS NULL
    OR (jersey_number ~ '^\d{1,2}$' AND jersey_number::int BETWEEN 1 AND 99)
  ) NOT VALID;

ALTER TABLE players
  ADD CONSTRAINT players_preferred_foot_known
  CHECK (preferred_foot IS NULL OR preferred_foot IN ('Left', 'Right', 'Both'))
  NOT VALID;

-- `position` is NOT NULL, so there is no NULL branch here. One existing row
-- holds '' and will fail this check if you ever VALIDATE it — see 1d.
ALTER TABLE players
  ADD CONSTRAINT players_position_known
  CHECK (position IN ('Goalkeeper', 'Defender', 'Midfielder', 'Forward'))
  NOT VALID;

-- A birth date has to be in the past and inside a human lifetime. This is
-- the loosest rule that still catches all 14 bad rows: it rejects
-- 82010-02-07, 1900-01-01 and the five dates in 2026. It deliberately does
-- NOT encode an age limit per tournament — eligibility is your ruling, not
-- a database constraint, and a U16 cutoff hard-coded here would silently
-- block next season's entries.
ALTER TABLE players
  ADD CONSTRAINT players_dob_plausible
  CHECK (dob > DATE '1940-01-01' AND dob < CURRENT_DATE)
  NOT VALID;

-- Both columns are NOT NULL, so these only guard against blanks and
-- single stray characters.
ALTER TABLE players
  ADD CONSTRAINT players_full_name_present
  CHECK (length(trim(full_name)) >= 2) NOT VALID;

ALTER TABLE players
  ADD CONSTRAINT players_nationality_present
  CHECK (length(trim(nationality)) >= 2) NOT VALID;

COMMIT;


-- =====================================================================
-- PART 3 — REVIEW LIST. Nothing is changed by anything below.
-- =====================================================================

-- 3a. The 14 implausible birth dates, with the academy to ask.
--     82010-02-07 is almost certainly 2010-02-07 (u16-league, where the
--     median birth year is 2011) but "almost certainly" is not good enough
--     to write into an age-eligibility record.
SELECT t.slug            AS tournament,
       r.academy_name,
       p.full_name,
       p.dob,
       p.id              AS player_id
FROM players p
JOIN registrations r ON r.id = p.registration_id
JOIN tournaments   t ON t.id = r.tournament_id
WHERE p.dob <= DATE '1995-01-01' OR p.dob >= DATE '2017-01-01'
ORDER BY p.dob;

-- 3b. The 42 heights entered in feet. Multiplying by 30.48 would give
--     170cm for 5.6 — plausible, and still a number nobody actually typed.
--     Your call: convert, blank them, or leave them (they already render
--     as nothing, since parseHeightCm rejects a decimal).
SELECT t.slug AS tournament, r.academy_name, p.full_name, p.height_cm,
       round((p.height_cm::numeric * 30.48))::int AS would_become_cm
FROM players p
JOIN registrations r ON r.id = p.registration_id
JOIN tournaments   t ON t.id = r.tournament_id
WHERE p.height_cm ~ '^\d+\.\d+$'
ORDER BY t.slug, r.academy_name;

-- 3c. Squads with two players wearing the same shirt number (14 of 62).
SELECT t.slug AS tournament, r.academy_name, p.jersey_number,
       count(*) AS players_with_this_number,
       string_agg(p.full_name, ' | ' ORDER BY p.full_name) AS who
FROM players p
JOIN registrations r ON r.id = p.registration_id
JOIN tournaments   t ON t.id = r.tournament_id
WHERE p.jersey_number IS NOT NULL
GROUP BY t.slug, r.academy_name, p.jersey_number
HAVING count(*) > 1
ORDER BY t.slug, r.academy_name, p.jersey_number;

-- 3d. One proof-of-age document attached to many players. The largest
--     group is 16 players sharing a single file — so 15 of them have no
--     evidence of age on record at all. Same pattern on photo_url.
SELECT t.slug AS tournament, r.academy_name,
       count(*) AS players_sharing_one_document,
       p.proof_of_age_path
FROM players p
JOIN registrations r ON r.id = p.registration_id
JOIN tournaments   t ON t.id = r.tournament_id
WHERE p.proof_of_age_path IS NOT NULL
GROUP BY t.slug, r.academy_name, p.proof_of_age_path
HAVING count(*) > 1
ORDER BY count(*) DESC;

-- 3e. Registrations that look like the same team entered twice — same
--     phone number, or the same academy name, within one tournament.
--     Eight of each. Some are genuinely two squads from one academy;
--     only you can tell which.
SELECT t.slug AS tournament, r.contact_phone,
       count(*) AS registrations,
       string_agg(r.academy_name, ' | ' ORDER BY r.created_at) AS names,
       string_agg(r.id::text,     ' | ' ORDER BY r.created_at) AS ids
FROM registrations r
JOIN tournaments t ON t.id = r.tournament_id
WHERE r.contact_phone IS NOT NULL
GROUP BY t.slug, r.contact_phone
HAVING count(*) > 1
ORDER BY count(*) DESC;

-- 3f. Squads larger than their tournament's cap. Three secondary-cup
--     squads hold 18, 18 and 16 against a cap of 15, so the team portal
--     will greet them with "18 of 15 on your roster".
SELECT t.slug AS tournament, r.academy_name, count(p.id) AS squad_size
FROM registrations r
JOIN tournaments t ON t.id = r.tournament_id
LEFT JOIN players p ON p.registration_id = r.id
GROUP BY t.slug, r.academy_name, r.id
HAVING (t.slug = 'secondary-cup' AND count(p.id) > 15)
    OR (t.slug = 'u16-league'    AND count(p.id) > 25)
    OR (t.slug = 'unity-cup'     AND count(p.id) > 20)
    OR (t.slug = 'peace-cup'     AND count(p.id) > 20)
ORDER BY squad_size DESC;

-- 3g. Three columns that are blank on all 976 rows — dead weight from an
--     earlier design (consent forms are on paper now). Drop only if you
--     are sure nothing reads them:
--     ALTER TABLE players DROP COLUMN consent_form_url,
--                         DROP COLUMN consent_form_path,
--                         DROP COLUMN proof_of_age_url;
SELECT count(*) FILTER (WHERE consent_form_url  IS NOT NULL) AS consent_form_url_used,
       count(*) FILTER (WHERE consent_form_path IS NOT NULL) AS consent_form_path_used,
       count(*) FILTER (WHERE proof_of_age_url  IS NOT NULL) AS proof_of_age_url_used,
       count(*) AS total_rows
FROM players;
