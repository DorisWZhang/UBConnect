import { INTEREST_TO_CATEGORY, getMatchedCategories } from '../src/constants/interestMapping';

describe('INTEREST_TO_CATEGORY', () => {
  it('maps every interest from ALL_INTERESTS to a valid category', () => {
    const ALL_INTERESTS = [
      'Anime', 'Board Games', 'Bowling', 'Billiards', 'Cars', 'Chess',
      'Cooking', 'Cycling', 'Dancing', 'Drawing', 'Driving', 'Esports',
      'Gaming', 'Go Karting', 'Golf', 'Gym', 'Hiking', 'Horseback Riding',
      'Ice Skating', 'Karaoke', 'Martial Arts', 'Movies', 'Music', 'Painting',
      'Photography', 'Programming', 'Reading', 'Rock Climbing', 'Rollerblading',
      'Running', 'Shopping', 'Shooting Sports', 'Skiing', 'Skateboarding',
      'Snowboarding', 'Sports', 'Surfing', 'Swimming', 'Squash', 'Traveling', 'Yoga',
    ];
    const VALID_CATEGORIES = [
      'Sports', 'Esports', 'Music', 'Arts', 'Food',
      'Academic', 'Social', 'Volunteering', 'Outdoors', 'Fitness', 'Indoor',
    ];

    for (const interest of ALL_INTERESTS) {
      expect(INTEREST_TO_CATEGORY).toHaveProperty(interest);
      expect(VALID_CATEGORIES).toContain(INTEREST_TO_CATEGORY[interest]);
    }
  });
});

describe('getMatchedCategories', () => {
  it('returns empty set for empty interests', () => {
    expect(getMatchedCategories([])).toEqual(new Set());
  });

  it('maps multiple interests to their categories', () => {
    const result = getMatchedCategories(['Hiking', 'Chess', 'Cooking']);
    expect(result).toEqual(new Set(['Outdoors', 'Indoor', 'Food']));
  });

  it('deduplicates categories from multiple interests', () => {
    const result = getMatchedCategories(['Hiking', 'Cycling', 'Running']);
    expect(result).toEqual(new Set(['Outdoors']));
  });

  it('ignores unknown interests gracefully', () => {
    const result = getMatchedCategories(['Hiking', 'UnknownThing']);
    expect(result).toEqual(new Set(['Outdoors']));
  });
});
