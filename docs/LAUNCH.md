# Launching Locked in on Google Play

A step-by-step checklist. ✅ = done in the code, 👤 = you, 🤝 = together in a Claude session.

## 1. Accounts and backend

- 👤 **Google Play Console** — play.google.com/console → sign up as an *individual*, pay $25, verify your identity (takes a few days).
- 👤 **Supabase** — supabase.com → New project `locked-in`, region in the **EU** (this project: West EU, Ireland). Save the database password in a password manager.
- 🤝 **Set up the database** — Claude runs the files in `supabase/migrations/` and deploys the functions in `supabase/functions/` using a Supabase access token you enter in the secure form (never in chat).
- 👤 **Anthropic key** — console.anthropic.com → API keys → Create key. Paste it **only** in Supabase → Edge Functions → Secrets as `ANTHROPIC_API_KEY`. Add ~$5 credit; each AI photo costs about $0.02.
- 🤝 **Connect the app** — put the project URL and publishable key in `.env` (see `.env.example`). Both are public by design.
- 👤 **Supabase Auth settings** — Authentication → URL Configuration → *Site URL*: set it to your website or privacy page, so the "confirm your email" link lands somewhere nice.

## 2. Privacy policy (required)

- ✅ In the app: Profile → Privacy policy, and linked from the sign-in screen.
- 👤 Fill in your name and contact email in `src/data/privacy.ts` and `docs/privacy-policy.md`.
- 🤝 Publish it at a public URL (GitHub Pages from this repo, or a free Google Site). Google Play needs that URL.

## 3. Production build

```bash
npx eas-cli@latest build -p android --profile production   # creates an .aab for Google Play
```

The `production` profile in `eas.json` builds an App Bundle and raises the version number automatically.

## 4. Play Console — app setup

Create the app: name **Locked in**, default language English (add Dutch later), App, Free.

**Store listing**

- **Short description (≤ 80 chars):** Track food, training and habits. Compete with friends. Lock in. Level up.
- **Full description:**

  > Locked in is your all-in-one fitness, nutrition and habit app.
  >
  > 🍽 **Fuel** — Track calories and macros. Scan barcodes, snap a photo of your meal and let AI estimate it, or add food in seconds.
  > 🏋️ **Train** — Log gym sessions with sets, reps and weights, runs with distance and pace, and any other sport.
  > ✅ **Build habits** — Daily goals for protein, calories, training, steps, water and sleep. Lock in your day and build streaks.
  > ⌚ **Recover** — Sync steps, sleep, heart rate and workouts from Garmin and other watches via Health Connect.
  > 👥 **Compete** — Add friends, climb the weekly leaderboard, start challenges, and like and comment on each other's workouts.
  > 📅 **See your progress** — A calendar of every locked-in day, points and achievements.
  >
  > LOCK IN. LEVEL UP.

- **Graphics:** app icon 512×512 (`assets/images/icon.png` resized), feature graphic 1024×500, at least 2 phone screenshots. 🤝 Claude can generate the feature graphic and screenshots.

**App content** (Policy → App content)

| Form | Answer |
|---|---|
| Privacy policy | Your public URL from step 2 |
| Ads | No ads |
| App access | Login required → give reviewers a test account (email + password) |
| Content rating | Questionnaire → category *Utility/Productivity/Health*; no violence etc. → rated for everyone |
| Target audience | 16+ (not designed for children) |
| Health apps declaration | Fitness / nutrition tracking. Not a medical device |
| **Health Connect** | Declare each permission: Steps, Sleep, Heart rate, Resting heart rate, Exercise, Distance → *"Show the user's activity, sleep and heart rate in the app, auto-complete daily habits and import workouts into the training log."* |
| Account deletion | In-app: Profile → Delete my account. Also give a web URL or email where users can request deletion |

**Data safety** (what to tick)

| Data type | Collected | Shared | Purpose | Optional |
|---|---|---|---|---|
| Email address, Name | Yes | No | App functionality, Account management | No |
| Health info (weight, nutrition log) | Yes | No | App functionality | No |
| Fitness info (workouts, steps, heart rate, sleep) | Yes | No | App functionality | Health Connect parts: Yes |
| Photos (meal photos) | Yes, processed, not stored | No* | App functionality | Yes |
| User-generated content (comments) | Yes | No | App functionality | Yes |

\* Processors acting on your behalf (Supabase, Anthropic) are *not* "sharing" under Google's definition.
Data is encrypted in transit ✔. Users can request deletion ✔.

## 5. Testing tracks (new personal accounts)

Google requires a **closed test with at least 12 testers for 14 days in a row** before you may publish publicly.

1. Testing → Closed testing → create a track, upload the `.aab`.
2. Add testers by email (a Google Group is easiest), and share the opt-in link with 12+ friends.
3. Ask them to install it and keep it for 14 days (using it helps: Google asks how testing went).
4. After 14 days: Apply for production access → answer the questions → roll out to Production.

## 6. After launch

- **Updates:** small JS-only fixes can ship instantly with `npx eas-cli@latest update`; anything with new native libraries needs a new build + store release.
- **Garmin direct sync:** apply to the Garmin Connect Developer Program; Health Connect covers Garmin until then.
- **iPhone:** Apple Developer Program ($99/year), then `eas build -p ios` — the code is already cross-platform (Health Connect parts are Android-only; Apple Health is a later addition).
