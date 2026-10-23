import { BOOKING } from "./config";

/*
  Where a runner stands with booking a session in Wodify:
    "past"    — the session has gone
    "booked"  — they've ticked "J'ai réservé" on this phone
    "soon"    — Wodify doesn't open bookings yet (opensOn = the day it does)
    "open"    — bookable now
  Dates are "YYYY-MM-DD" keys, as everywhere in the app.
*/

const addDays = (key, days) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};

export const bookingOpensOn = (sessionDate) => addDays(sessionDate, -BOOKING.opensDaysBefore);

export const bookingState = (sessionDate, today, booked) => {
  if (sessionDate < today) return { status: "past" };
  if (booked) return { status: "booked" };
  const opensOn = bookingOpensOn(sessionDate);
  if (today < opensOn) return { status: "soon", opensOn };
  return { status: "open" };
};

/* The small print under the button */
export const bookingRules = () =>
  `Réservations ouvertes ${BOOKING.opensDaysBefore} jours avant · annulation jusqu'à ${BOOKING.cancelHoursBefore} h avant`;
