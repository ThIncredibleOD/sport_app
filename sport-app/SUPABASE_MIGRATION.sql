
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS consent_form_path TEXT,
  ADD COLUMN IF NOT EXISTS proof_of_age_path TEXT;


ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS payment_receipt_path TEXT;


ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;


-- Anyone can SELECT tournament info (needed to look up tournament_id by slug).
CREATE POLICY "Anyone can read tournaments"
  ON tournaments FOR SELECT
  USING (true);


-- Anyone can INSERT a new registration (public registration flow)
CREATE POLICY "Anyone can insert registrations"
  ON registrations FOR INSERT
  WITH CHECK (true);


CREATE POLICY "Block all client updates to registrations"
  ON registrations FOR UPDATE
  USING (false);



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

