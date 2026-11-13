/**
 * DEMO friends and feed.
 * Real friends need user accounts and a server (roadmap stage 2).
 * Until then these placeholders show how the social features will look.
 */
export type Friend = { id: string; name: string; initials: string; weekPoints: number; streak: number };

export const DEMO_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Sanne', initials: 'S', weekPoints: 640, streak: 21 },
  { id: 'f2', name: 'Daan', initials: 'D', weekPoints: 515, streak: 9 },
  { id: 'f3', name: 'Yasmine', initials: 'Y', weekPoints: 430, streak: 14 },
  { id: 'f4', name: 'Milan', initials: 'M', weekPoints: 280, streak: 4 },
  { id: 'f5', name: 'Noah', initials: 'N', weekPoints: 150, streak: 2 },
];

export type FeedPost = {
  id: string;
  friendId: string;
  when: string;
  title: string;
  stats: { label: string; value: string }[];
  likes: number;
  comments: number;
};

export const DEMO_FEED: FeedPost[] = [
  {
    id: 'p1',
    friendId: 'f1',
    when: '2h ago',
    title: 'Morning tempo run',
    stats: [
      { label: 'Distance', value: '8.2 km' },
      { label: 'Pace', value: '4:52 /km' },
      { label: 'Time', value: '39:54' },
    ],
    likes: 12,
    comments: 3,
  },
  {
    id: 'p2',
    friendId: 'f3',
    when: '5h ago',
    title: 'Push day, new bench PR',
    stats: [
      { label: 'Exercises', value: '5' },
      { label: 'Top set', value: '70 kg × 5' },
      { label: 'Time', value: '62 min' },
    ],
    likes: 24,
    comments: 7,
  },
  {
    id: 'p3',
    friendId: 'f2',
    when: 'Yesterday',
    title: 'Hit 100% of daily habits',
    stats: [
      { label: 'Habits', value: '6 / 6' },
      { label: 'Streak', value: '9 days' },
    ],
    likes: 8,
    comments: 1,
  },
];

export type Challenge = { id: string; title: string; detail: string; progress: number };

export const DEMO_CHALLENGES: Challenge[] = [
  { id: 'c1', title: '50 km in October', detail: 'Sanne, Daan + 3 others', progress: 0.62 },
  { id: 'c2', title: '7 days protein goal', detail: 'Yasmine + 1 other', progress: 0.43 },
];
