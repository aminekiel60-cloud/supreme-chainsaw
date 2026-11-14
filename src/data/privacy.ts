/**
 * Privacy policy shown in the app (Profile → Privacy policy) and published for
 * Google Play. Keep docs/privacy-policy.md in sync when changing this.
 * Fill in the [brackets] before publishing.
 */
export const PRIVACY_UPDATED = '14 November 2026';

export const PRIVACY_POLICY: { title: string; body: string }[] = [
  {
    title: 'Who we are',
    body: 'Locked in is a fitness, nutrition and habit app made by [Your full name], Belgium. Contact: [your contact email]. We are the data controller for the personal data described here.',
  },
  {
    title: 'What we collect',
    body: '• Account: email address, password (stored encrypted by our provider) and the name you choose.\n• Profile: age, sex, height, weight, activity level and goal, used only to calculate your calorie and macro goals.\n• Your log: foods, workouts, habits and settings you enter.\n• Health Connect data (only if you turn it on): steps, sleep sessions and sleep stages, heart rate, resting heart rate, heart-rate variability, active calories burned, body weight, exercise sessions and distance.\n• Social: friends you add, your posts (workouts, locked-in days, photos, meals and captions), flexes and comments, people you block and posts you report.\n• Location (only while you track a run, walk or ride): your GPS route, distance and pace. Location is never read in the background.\n• Progress photos you take in Body stay on your phone and are never uploaded.\n• Meal photos you choose to analyse with AI.',
  },
  {
    title: 'How we use it',
    body: 'Only to run the app for you: show your progress, calculate goals, streaks and points, sync your data between devices, show your posts to your friends (or to all users when you choose Everyone for a post), keep the community safe with blocking and reporting, estimate the nutrition of meal photos and write your weekly coach advice. We do not sell your data, show ads or use your data for advertising.',
  },
  {
    title: 'Who sees your posts',
    body: 'Your posts are shown to your friends. Only when you choose Everyone for a post is it shown to all Locked in users in For You, together with your name, profile picture and level. You can change this or delete the post at any time. You can block anyone: you then no longer see each other’s posts and comments. Reported posts are checked by us; a post with several reports is hidden from For You.',
  },
  {
    title: 'Health Connect',
    body: 'Data read from Health Connect is used only to show your steps, sleep, heart rate, calories burned and readiness score in the app, to tick your steps and sleep habits, to keep your body-weight log up to date, and to add your workouts to your training log. It is never used for advertising, never sold and never shared with third parties other than the processors listed below that store your synced log. The use of information received from Health Connect adheres to the Health Connect Permissions policy, including the Limited Use requirements. You can turn the connection off at any time in You, Settings, Health Connect.',
  },
  {
    title: 'AI features',
    body: 'When you use AI photo, the photo is sent to Anthropic (Claude) to recognise the food. We do not store these photos. When you ask the weekly coach for advice, your totals for the week (workouts, food, sleep and weight, without your name or photos) are sent to Anthropic to write it. Anthropic processes this data to return the result and does not use it to train its models.',
  },
  {
    title: 'Who processes your data',
    body: '• Supabase (database, login and server functions), servers in the EU (Ireland).\n• Anthropic (AI meal photo recognition).\n• Open Food Facts (barcode lookups; only the barcode number is sent).\n• Expo (app updates and crash-free delivery of the app).\nThese providers only process data on our instructions.',
  },
  {
    title: 'Legal basis (GDPR)',
    body: 'We process your data to provide the service you signed up for (contract). Health data from Health Connect and meal photos are processed only with your explicit consent, which you give by turning on the feature and can withdraw at any time.',
  },
  {
    title: 'How long we keep it',
    body: 'As long as you have an account. When you delete your account (You, Settings, Delete my account), all your data, posts, comments and friendships are deleted immediately from our database.',
  },
  {
    title: 'Your rights',
    body: 'You can access, correct, export or delete your data and object to or restrict its processing. Most of this you can do in the app; for anything else email [your contact email]. You can also complain to the Belgian Data Protection Authority (www.dataprotectionauthority.be).',
  },
  {
    title: 'Children',
    body: 'Locked in is not meant for children under 16.',
  },
  {
    title: 'Changes',
    body: 'If we change this policy we will update the date below and tell you in the app.',
  },
];
