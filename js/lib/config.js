/*
  The shared parts — the "Je viens" list and sessions written by coaches —
  live in a small Supabase database. Until these two are filled in, both
  still work on the phone, but only that phone sees them.
  Setup: README → "Switching on the shared database".

  The anon key is meant to be public (it ships inside the app);
  what it can do is limited by the rules in supabase/schema.sql.
*/

export const SUPABASE_URL = ""; // e.g. "https://abcdefgh.supabase.co"
export const SUPABASE_ANON_KEY = "";

/*
  Typing this code in Profile → "Mode coach" unlocks the coach screens
  (write sessions, see who's coming, Sean's own week). Change it before
  launch, and again if it gets around.
*/
export const COACH_CODE = "floride";

/*
  Booking goes through Wodify (the run club class). The button on each
  session opens this link. Leave JE_VIENS false unless you want the in-app
  "Je viens" list as well.
*/
export const WODIFY_BOOKING_URL = "https://app.wodify.com/Schedule/CalendarListViewEntry.aspx";
export const JE_VIENS = false;
