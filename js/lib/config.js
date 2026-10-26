/*
  The shared parts — sign-ups (members-only sign-in) and sessions written by
  coaches — live in a small Supabase database.
  Setup: README → "Switching on the shared database".

  The anon key is meant to be public (it ships inside the app);
  what it can do is limited by the rules in supabase/schema.sql.
*/

export const SUPABASE_URL = "https://rqomypmgbjigukvztjxz.supabase.co"; // e.g. "https://abcdefgh.supabase.co"
export const SUPABASE_ANON_KEY = "sb_publishable_LnDYfyrKMTOunfAH29ZFTQ_CY3GtJE5";

/*
  Typing this code in Profile → "Mode coach" unlocks the coach screens
  (write sessions, see who's coming, Sean's own week). Change it before
  launch, and again if it gets around.
*/
export const COACH_CODE = "floride";

/*
  Booking goes through Wodify only (the Run Club class), in the Wodify app.
  The button opens the app (js/lib/booking.js → openWodify):
    1. the app itself, if one of `schemes` opens it (Wodify doesn't publish
       one — the app tries these and keeps the one that works)
    2. otherwise its App Store / Google Play page ("Ouvrir" if it's installed)
  The website stays as the small "pas l'app ?" link underneath.
*/
export const WODIFY_APP = {
  ios: "itms-apps://apps.apple.com/app/id1563729830", // Wodify (client app) on the App Store
  iosWeb: "https://apps.apple.com/app/id1563729830",
  androidPackage: null, // TODO: the id= from the Wodify app's Google Play link (Play Store → Wodify → Partager)
  schemes: ["wodify://", "wodifyapp://", "wodifyclient://"], // also listed in app.json (LSApplicationQueriesSchemes)
};
export const WODIFY_BOOKING_URL = "https://app.wodify.com/Schedule/CalendarListViewEntry.aspx"; // website fallback
export const WODIFY_HINT = "Dans Wodify : Planning → RUN CLUB → la séance";

/*
  The Wodify booking rules for the Run Club class, shown next to the button
  (keep them in step with the class settings in Wodify Admin).
*/
export const BOOKING = {
  opensDaysBefore: 7, // reservations open 7 days before
  cancelHoursBefore: 2, // cancel up to 2 h before
  time: "16h30",
  place: "Piste de la Floride",
};
