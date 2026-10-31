import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";

import { phaseAnnouncement, DONE_ANNOUNCEMENT, elapsedOf, positionAt } from "./timer";

/*
  What the chrono says and when.

  Two channels, because a beginner's phone is usually in a pocket or an
  armband:
  - the voice (expo-speech, fr-FR) when the app is on screen;
  - a lock-screen notification with sound at every phase change, scheduled
    ahead from the wall clock, so a locked phone still buzzes and shows
    "Cours — 2:00". Rescheduled on resume/skip, cancelled on pause/stop.

  iOS note: the voice is silent in silent mode; the notification sound isn't.
*/

export const say = (text) => {
  try {
    Speech.stop();
    Speech.speak(text, { language: "fr-FR", rate: 1.0 });
  } catch (_) {}
};

export const hush = () => {
  try {
    Speech.stop();
  } catch (_) {}
};

/* Short, friendly — not a drill sergeant. Picked by set so it doesn't repeat within a session. */
const MIDWAY = ["À mi-chemin, tu gères.", "Moitié faite. Reste souple.", "La moitié — garde ton allure.", "Mi-course. Respire, c'est bien."];
const LAST_RUN = "Dernière course de la séance. Finis-la bien.";
export const midwayLine = (phase) => (phase.sets > 1 && phase.set === phase.sets ? LAST_RUN : MIDWAY[(phase.set || 1) % MIDWAY.length]);

let handlerSet = false;
const ensureHandler = () => {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: false, shouldPlaySound: true, shouldSetBadge: false }),
  });
};

export const askNotifications = async () => {
  try {
    ensureHandler();
    const have = await Notifications.getPermissionsAsync();
    if (have.granted) return true;
    const got = await Notifications.requestPermissionsAsync();
    return !!got.granted;
  } catch (_) {
    return false;
  }
};

const titleOf = (phase) => (phase.kind === "run" ? "Cours" : "Marche");
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/* Schedule one alert per upcoming phase start (+ one for the end), from where the clock is now */
export const scheduleAlerts = async (phases, clock, now) => {
  try {
    ensureHandler();
    await Notifications.cancelAllScheduledNotificationsAsync();
    const elapsed = elapsedOf(clock, now);
    const pos = positionAt(phases, elapsed);
    if (pos.done) return;
    let at = now + pos.remaining * 1000; // start of the next phase
    for (let i = pos.index + 1; i < phases.length; i++) {
      const p = phases[i];
      await Notifications.scheduleNotificationAsync({
        content: { title: `${titleOf(p)} — ${mmss(p.seconds)}`, body: `${p.label} · ${p.cue}`, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
      at += p.seconds * 1000;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: "Séance terminée", body: DONE_ANNOUNCEMENT, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  } catch (_) {}
};

export const clearAlerts = () => Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

export { phaseAnnouncement, DONE_ANNOUNCEMENT };
