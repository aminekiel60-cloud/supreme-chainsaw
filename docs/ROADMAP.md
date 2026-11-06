# Locked in: roadmap to launch

The full vision is MyFitnessPal + Strava + Garmin Connect + a habit tracker in one app. That's too much to build in one go, so we build it in stages. Each stage gives you a working app you can test with real people.

## Stage 1: MVP on your phone ✅ (this repository)

- All 5 tabs: Home, Nutrition, Training, Calendar and Friends (with demo friends)
- Manual food logging, workout logging (gym, run, other), habits, streaks, points and achievements
- Data saved on the phone
- **Cost: €0.** Test it with Expo Go.

**Your homework:** use it yourself every day for 1–2 weeks. Write down what feels wrong or missing. That list is gold.

## Stage 2: Accounts, cloud and real friends

Needed for: logging in, keeping data on a new phone, real friends, the feed, likes, comments and challenges.

- Add a backend. **Supabase** (recommended) or Firebase gives you login, a database and real-time updates without running your own server.
- Screens: sign up / log in, profile, search and add friends, accept invites
- Move the data in `src/store/store.tsx` from phone-only storage to the cloud
- Real weekly leaderboard and feed, generated from friends' workouts
- **Cost:** free tier to start (Supabase is free up to roughly 50,000 monthly users)

## Stage 3: Smarter food logging

- **Food database:** [Open Food Facts](https://world.openfoodfacts.org) (free, strong in NL/EU)
- **Barcode scanner:** `expo-camera` reads barcodes, then looks up the product in Open Food Facts
- **AI photo recognition:** take a photo, send it to a vision AI model (e.g. Claude), and get back the estimated food plus calories and macros. Always let the user confirm or edit the result.
  - **Cost:** a few cents per photo, so this is a good candidate for a premium feature
  - The AI key must live on your backend (stage 2), never inside the app
- **Note:** from this stage you need a "development build" instead of Expo Go (`eas build --profile development`)

## Stage 4: Garmin and health data

- **Garmin:** apply for the [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/) (Health API + Activity API). It's free, but Garmin must approve your business/app. Apply early because approval can take weeks.
- **Apple Health** (iPhone) and **Health Connect** (Android): steps, heart rate and sleep from any watch, with no approval needed. This is often the faster first step.
- **Unlocks:** the "Recover" card (heart rate, sleep stages), automatic step habit and auto-imported runs

## Stage 5: Polish and launch

- **Onboarding:** set goals from age, weight, height and activity level
- **Push notifications** ("Your streak is at risk!") via `expo-notifications`
- **Privacy policy** (required by both stores, and GDPR/AVG applies since you're in the EU)
- **Store accounts:**
  - Apple Developer Program: **$99/year**
  - Google Play Console: **$25 one-time**
- **Build and submit from the cloud** with EAS (no Mac needed): `npx eas-cli@latest build`, then `eas submit`
- **Beta testing:** TestFlight (iPhone) and Internal testing (Android) with 10–50 friends first

## Rough budget (self-funded)

| Item | Cost |
|---|---|
| Stages 1–2 development | €0 (your time) |
| Apple Developer | $99 / year |
| Google Play | $25 once |
| Supabase / Firebase | €0 to start, ~€25/month once you grow |
| AI photo recognition | ~€0.01–0.03 per photo |
| EAS builds | free tier is enough to start |
| Domain + simple website / privacy page | ~€15 / year |

**Realistic minimum to launch: about €150 in the first year.**

## Making money later (ideas)

- **Free:** tracking, habits, friends
- **Premium (~€4.99/month):** AI photo logging, advanced stats, custom challenges, Garmin deep sync
- Use **RevenueCat** to handle subscriptions on both stores
