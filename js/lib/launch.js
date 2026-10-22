/*
  The opening: a short clip of someone running (Sean at Hyrox Bordeaux)
  that plays once, muted, when the app opens, with the wordmark fading in
  over it. Until the clip is in, the still frame plays the same role.

  To add the clip: drop it at assets/launch/opening.mp4 (portrait, a few
  seconds, under ~3 MB — e.g. `ffmpeg -i in.mov -t 3 -vf scale=720:-2 -an
  -crf 28 opening.mp4`), then swap the two lines below.
*/

export const still = require("../../assets/launch/opening-still.jpg");
export const clip = null; // require("../../assets/launch/opening.mp4");

export const SECONDS = 2.6; // how long the still shows (the clip plays its own length)
