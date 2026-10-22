/*
  The shared "Je viens" list lives in a small Supabase database.
  Until these two are filled in, "Je viens" still works on the phone,
  but nobody else sees it. Setup: README → "Switching on the Je viens list".

  The anon key is meant to be public (it ships inside the app);
  what it can do is limited by the rules in supabase/schema.sql.
*/

export const SUPABASE_URL = ""; // e.g. "https://abcdefgh.supabase.co"
export const SUPABASE_ANON_KEY = "";
