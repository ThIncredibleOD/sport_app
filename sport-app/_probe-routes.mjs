// Mirrors registerPathRequiresAdmin + the proxy branch, to enumerate behaviour.
const TOURNAMENTS = [
  { flow: "league", adminOnly: false },
  { flow: "secondary-cup", adminOnly: false },
  { flow: "unity-cup", adminOnly: true },
  { flow: "peace-cup", adminOnly: false },
];

const requiresAdmin = (pathname) =>
  TOURNAMENTS.some(
    (t) =>
      t.adminOnly &&
      (pathname === `/register/${t.flow}` ||
        pathname.startsWith(`/register/${t.flow}/`)),
  );

const STEPS = [
  "account-profile", "team-manager", "academy-squad", "assistant-coach",
  "medics", "players", "review", "submit", "confirmation",
];

const cases = ["/register"];
for (const t of TOURNAMENTS) {
  cases.push(`/register/${t.flow}`);
  for (const s of STEPS) cases.push(`/register/${t.flow}/${s}`);
}
// Adversarial: things that must NOT slip past the gate, and must NOT be locked.
cases.push(
  "/register/unity-cupx/account-profile",   // must be PUBLIC (not a real flow)
  "/register/unity-cup-extra/players",      // must be PUBLIC
  "/registerunity-cup/players",             // not under /register/ at all
  "/register/peace-cup/../unity-cup/submit" // raw, unnormalised
);

let locked = 0, open = 0;
for (const p of cases) {
  const r = requiresAdmin(p);
  if (r) locked++; else open++;
  const flag = r ? "ADMIN" : "public";
  // Only print the interesting ones plus every unity-cup row.
  if (r || p.includes("unity") || !p.includes("/")) console.log(`${flag.padEnd(6)} ${p}`);
}
console.log(`\ntotals: ${locked} admin-gated, ${open} public, ${cases.length} checked`);

// Assertions.
const must = [
  ["/register", false],
  ["/register/league/players", false],
  ["/register/peace-cup/submit", false],
  ["/register/secondary-cup/account-profile", false],
  ["/register/unity-cup", true],
  ["/register/unity-cup/account-profile", true],
  ["/register/unity-cup/team-manager", true],
  ["/register/unity-cup/submit", true],
  ["/register/unity-cupx/account-profile", false],
];
let bad = 0;
for (const [p, want] of must) {
  const got = requiresAdmin(p);
  if (got !== want) { console.log(`FAIL ${p}: want ${want} got ${got}`); bad++; }
}
console.log(bad === 0 ? "\nall assertions passed" : `\n${bad} ASSERTION FAILURES`);
