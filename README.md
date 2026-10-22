# Essor Athletics

The run club app for CrossFit Essor (Bayonne). iPhone and Android from one codebase.

- **Sessions** — every Friday session, written once by the coaches, shown to each runner for their level (Beginner A/B/C, Level 3/2/1) with every rep turned into a time or distance from their VMA.
- **VMA** — typed in, or from the 6-minute test (metres ÷ 100). Gives each runner their paces (EF, seuil, 10 km, VMA).
- **Records** — 5 km, 10 km, semi, marathon: every time logged, best one marked.
- **Je viens** — say you're coming to a session and see who else is.
- No account yet: everything is saved on the phone. The "Je viens" list is shared through a small Supabase database once it's switched on (below).

## How it's built

Expo (React Native), same base as Daily Move: Programme's components, transitions and type, with Essor's vert sapin as the accent and "essor" set in Archivo Black Italic.

| Where | What's in it |
| --- | --- |
| `js/App.js` | Theme, what's saved on the phone, which stack to show |
| `js/lib/sessions.js` | **The sessions** — edit this to write the programme (format explained at the top of the file) |
| `js/lib/levels.js` | The six levels |
| `js/lib/plan.js` | Turns a session into one runner's version (their level, their VMA) |
| `js/lib/paces.js` | VMA → speed → pace → target time |
| `js/lib/records.js` | Record distances |
| `js/lib/attendance.js`, `js/lib/config.js` | "Je viens" and the shared list |
| `js/screens/` | Welcome, Question (first-run questions), Home, Session, Profile, Vma, Record |
| `supabase/schema.sql` | The table behind "Je viens" |
| `scripts/test_paces.js` | Checks the maths and that every session is written correctly |

## Writing sessions

Open `js/lib/sessions.js`, copy a session, change it. A rep is `{ run: 400, vma: 100 }` (400 m at 100 % VMA) or `{ run: "0:30", vma: 105 }`; recoveries are `{ jog: "1:00" }` / `{ walk: "1:00" }`; sets are `{ repeat: 2, steps: [...], rest: { jog: "3:00" } }`. Then:

```
node scripts/test_paces.js
```

It fails with the session and step if something's mistyped.

## Switching on the "Je viens" list

1. Create a free project at https://supabase.com/dashboard (region: Paris / eu-west-3).
2. SQL Editor → New query → paste `supabase/schema.sql` → Run.
3. Project Settings → API: copy the Project URL and the `anon` public key into `js/lib/config.js`.

## Running it on your phone (first time, on a Mac)

Same setup as Daily Move (Xcode, Homebrew, `brew install node watchman cocoapods`). Then:

```
git clone https://github.com/Sean-Klein-64/essor-athletics.git
cd essor-athletics
npm install
npx expo run:ios --device
```

Android phone: install Android Studio once, turn on USB debugging on the phone, then `npx expo run:android --device`.

## Getting it to members

- Build both in the cloud with EAS (`npx eas-cli@latest build --platform all`) — no Xcode needed for that.
- iPhone: TestFlight public link to start, App Store later. Android: Play Console internal/closed testing, or share the APK directly.
- New or changed sessions don't need a new download: `npx eas-cli@latest update` pushes them to everyone's app.

## Later

- **Garmin**: the Garmin Connect Training API pushes workouts to a runner's Garmin calendar and watch. Free, but Essor has to be approved as a business developer first. The session format here is already step-by-step (distance or time + % VMA target), so it converts directly.
- Accounts (so data follows a runner to a new phone, and coaches see everyone's VMA).

## Checking the JavaScript without a phone

```
npx expo export --platform ios
npx expo export --platform android
node scripts/test_paces.js
```
