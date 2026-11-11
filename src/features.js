// ── Features that are switched off for now ───────────────────────────
// Nuel, Nov 8–10: "remove trips as it may not come soon", "remove
// companion for now", "remove organization", "remove voice", "remove vis".
// The code behind each stays in place (the server still answers, and the
// tests still cover it), so turning one back on is a one-word change here.
export const FEATURES = {
  companion: false, // the AI Companion button and drawer
  vis: false, // Voices / VIS: extra @handles for different sides of you
  trips: false, // ride share (Add Hub, My City, Stash)
  organization: false, // organisation pages (Add Hub)
}
