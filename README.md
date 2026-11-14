# Locked in

**LOCK IN. LEVEL UP.**

Locked in is an all-in-one fitness, nutrition and lifestyle app. It tracks food, workouts and daily habits, adds streaks and points, and lets you compete with friends.

![Locked in screens](docs/screens.png)

This repository holds **stage 1 (MVP)**: a working iPhone and Android app with all five tabs. Your data is saved on your phone. The [roadmap](docs/ROADMAP.md) explains how we get from here to the App Store and Google Play.

---

## What's in the app

| Tab | What you can do |
|---|---|
| **Home** | Week strip, streak and weekly points, calorie ring and macros, water bottles, daily habits with your own targets, today's training, Recover card (Health Connect) and your level |
| **Food** | Food diary per day (switch days with the arrows), meals with a suggested budget, "+" per meal, tap an entry to edit it, copy yesterday's meal, barcode scanner, AI photo, your own foods |
| **Train** | Gym (sets × reps × kg, with "last time"), run, walk, cycle, swim and other sports, with photo and friends tagged. Weekly totals per sport, and a summary with a shareable Strava-style card |
| **Feed** | Your friends' activity with photos, likes and comments, the weekly ranking, and challenges. Add friends by name or invite code. Coach |
| **Profile** | Profile picture, level and XP, stats, badges, calendar, goals, friends, coach and settings |

**How progress works** (in `src/store/logic.ts` and `src/store/progress.ts`):

- **Habits:** protein, calories, training and water tick themselves. Steps and sleep come from Health Connect, or you tick them by hand.
- A day is **locked in** at ≥ 60% of habits done; consecutive locked-in days form your **streak**.
- **XP:** 10 per habit, 50 per workout, +25 for a locked-in day, +50 for a perfect day and +250 per challenge won. Levels go from Rookie to Legend.
- **Badges** come in bronze, silver, gold and legend tiers, for streaks, workouts, distance, perfect days, water, challenges and levels.

## Run it on your own phone (no coding experience needed)

You need a computer (Windows or Mac) and your phone, on the same Wi-Fi.

1. **Install Node.js** (the engine that runs the tools). Download the LTS version from <https://nodejs.org> and click through the installer.
2. **Install the Expo Go app** on your phone (App Store or Google Play).
3. **Download this project.** On GitHub, click the green **Code** button, then **Download ZIP**, and unzip it. If you have Git installed, you can run `git clone` instead.
4. **Open a terminal in the project folder.**
   - Windows: open the folder, click the address bar, type `cmd` and press Enter.
   - Mac: right-click the folder, then choose **New Terminal at Folder**.
5. **Install the project's libraries.** Do this once; it takes a few minutes:
   ```bash
   npm install
   ```
6. **Start the app:**
   ```bash
   npx expo start
   ```
   A QR code appears.
7. **Scan the QR code.** On iPhone, use the Camera app. On Android, use the scanner inside Expo Go. Locked in opens on your phone.

Every time you save a change in the code, the app on your phone updates within a second. To stop the app, press `Ctrl + C` in the terminal.

> Tip: install **Visual Studio Code** (<https://code.visualstudio.com>) to open and edit the project. It's free and is what most developers use.

---

## Where everything lives (project map)

```
src/
  app/                       ← every file here is a SCREEN
    _layout.tsx              ← app shell: login → onboarding → app, intro, celebrations
    (tabs)/index.tsx         ← Home
    (tabs)/nutrition.tsx     ← Food diary
    (tabs)/training.tsx      ← Train
    (tabs)/feed.tsx          ← Feed (activity, ranking, challenges)
    (tabs)/profile.tsx       ← Profile
    add-food.tsx, scan.tsx, photo.tsx, my-food.tsx, food/[id].tsx   ← food screens
    log-workout.tsx, workout/[id].tsx                                ← workout screens
    friends.tsx, coach.tsx, coach/[id].tsx, post/[id].tsx            ← social screens
    goals.tsx, settings.tsx, calendar.tsx, badges.tsx                ← you
  components/                ← building blocks (cards, water bottles, share card, …)
  constants/theme.ts         ← ALL colors (Neon Lime #A3FF3F, Midnight Black #111111)
  lib/                       ← Supabase, social, photos, Health Connect, reminders, haptics
  store/                     ← your data: types, rules (logic.ts), XP & badges (progress.ts)
supabase/
  migrations/                ← database tables and privacy rules
  functions/                 ← server functions (AI food photo, delete account)
  tests/                     ← privacy tests for the database rules
```

### Easy first changes to try

- **Change the brand color:** edit `lime` in `src/constants/theme.ts`.
- **Change the default habit targets:** edit `DEFAULT_HABIT_GOALS` in `src/store/logic.ts` (everyone can also change their own in Profile → Your goals).
- **Add a badge:** add a line to `badges()` in `src/store/progress.ts`.
- **Add a habit:** add a line to `HABITS` in `src/store/logic.ts`, its id to `HabitId` in `src/store/types.ts`, and a rule in `habitDone()`.
- **Add quick-add foods:** add lines to `src/data/foods.ts`.

## Built with

- [Expo](https://expo.dev) and [React Native](https://reactnative.dev): one codebase for iPhone, Android and web
- [Expo Router](https://docs.expo.dev/router/introduction/) for screens and navigation
- TypeScript, react-native-svg (logo and rings) and AsyncStorage (saving data)

Useful commands:

```bash
npx expo start          # run the app (scan the QR code with your phone)
npx expo start --web    # run it in your browser
npx tsc --noEmit        # check the code for mistakes
```
