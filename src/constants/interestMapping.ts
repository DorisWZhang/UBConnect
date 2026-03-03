/** Maps each user interest to its parent event category. */
export const INTEREST_TO_CATEGORY: Record<string, string> = {
  // Sports
  Sports: 'Sports',
  Golf: 'Sports',
  Swimming: 'Sports',
  Squash: 'Sports',
  Skiing: 'Sports',
  Skateboarding: 'Sports',
  Snowboarding: 'Sports',
  'Horseback Riding': 'Sports',
  Surfing: 'Sports',

  // Esports
  Esports: 'Esports',
  Gaming: 'Esports',

  // Music
  Music: 'Music',

  // Arts
  Anime: 'Arts',
  Drawing: 'Arts',
  Painting: 'Arts',
  Photography: 'Arts',

  // Food
  Cooking: 'Food',

  // Academic
  Programming: 'Academic',
  Reading: 'Academic',

  // Social
  Dancing: 'Social',
  Karaoke: 'Social',
  Movies: 'Social',
  Shopping: 'Social',
  Traveling: 'Social',

  // Outdoors
  Hiking: 'Outdoors',
  Cycling: 'Outdoors',
  Running: 'Outdoors',
  Driving: 'Outdoors',

  // Fitness
  Gym: 'Fitness',
  Yoga: 'Fitness',
  'Martial Arts': 'Fitness',
  'Rock Climbing': 'Fitness',
  Rollerblading: 'Fitness',
  'Ice Skating': 'Fitness',

  // Indoor
  Chess: 'Indoor',
  'Board Games': 'Indoor',
  Billiards: 'Indoor',
  Bowling: 'Indoor',
  'Go Karting': 'Indoor',
  'Shooting Sports': 'Indoor',
  Cars: 'Indoor',
};

/**
 * Convert a user's interest array into the set of event categories
 * they care about. Unknown interests are silently ignored.
 */
export function getMatchedCategories(userInterests: string[]): Set<string> {
  const categories = new Set<string>();
  for (const interest of userInterests) {
    const cat = INTEREST_TO_CATEGORY[interest];
    if (cat) categories.add(cat);
  }
  return categories;
}
