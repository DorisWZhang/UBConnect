import { ImageSourcePropType } from 'react-native';

/**
 * Static map of avatar keys to bundled image assets.
 *
 * Every `require()` call MUST be a literal string — Metro's bundler
 * cannot resolve dynamically-constructed paths.
 */
const AVATAR_IMAGES: Record<string, ImageSourcePropType> = {
  // ── Adventurer 01-30 ──────────────────────────────────────────────
  'avatar:adventurer-01': require('@/assets/avatars/adventurer-01.png'),
  'avatar:adventurer-02': require('@/assets/avatars/adventurer-02.png'),
  'avatar:adventurer-03': require('@/assets/avatars/adventurer-03.png'),
  'avatar:adventurer-04': require('@/assets/avatars/adventurer-04.png'),
  'avatar:adventurer-05': require('@/assets/avatars/adventurer-05.png'),
  'avatar:adventurer-06': require('@/assets/avatars/adventurer-06.png'),
  'avatar:adventurer-07': require('@/assets/avatars/adventurer-07.png'),
  'avatar:adventurer-08': require('@/assets/avatars/adventurer-08.png'),
  'avatar:adventurer-09': require('@/assets/avatars/adventurer-09.png'),
  'avatar:adventurer-10': require('@/assets/avatars/adventurer-10.png'),
  'avatar:adventurer-11': require('@/assets/avatars/adventurer-11.png'),
  'avatar:adventurer-12': require('@/assets/avatars/adventurer-12.png'),
  'avatar:adventurer-13': require('@/assets/avatars/adventurer-13.png'),
  'avatar:adventurer-14': require('@/assets/avatars/adventurer-14.png'),
  'avatar:adventurer-15': require('@/assets/avatars/adventurer-15.png'),
  'avatar:adventurer-16': require('@/assets/avatars/adventurer-16.png'),
  'avatar:adventurer-17': require('@/assets/avatars/adventurer-17.png'),
  'avatar:adventurer-18': require('@/assets/avatars/adventurer-18.png'),
  'avatar:adventurer-19': require('@/assets/avatars/adventurer-19.png'),
  'avatar:adventurer-20': require('@/assets/avatars/adventurer-20.png'),
  'avatar:adventurer-21': require('@/assets/avatars/adventurer-21.png'),
  'avatar:adventurer-22': require('@/assets/avatars/adventurer-22.png'),
  'avatar:adventurer-23': require('@/assets/avatars/adventurer-23.png'),
  'avatar:adventurer-24': require('@/assets/avatars/adventurer-24.png'),
  'avatar:adventurer-25': require('@/assets/avatars/adventurer-25.png'),
  'avatar:adventurer-26': require('@/assets/avatars/adventurer-26.png'),
  'avatar:adventurer-27': require('@/assets/avatars/adventurer-27.png'),
  'avatar:adventurer-28': require('@/assets/avatars/adventurer-28.png'),
  'avatar:adventurer-29': require('@/assets/avatars/adventurer-29.png'),
  'avatar:adventurer-30': require('@/assets/avatars/adventurer-30.png'),

  // ── Notionists 01-30 ──────────────────────────────────────────────
  'avatar:notionists-01': require('@/assets/avatars/notionists-01.png'),
  'avatar:notionists-02': require('@/assets/avatars/notionists-02.png'),
  'avatar:notionists-03': require('@/assets/avatars/notionists-03.png'),
  'avatar:notionists-04': require('@/assets/avatars/notionists-04.png'),
  'avatar:notionists-05': require('@/assets/avatars/notionists-05.png'),
  'avatar:notionists-06': require('@/assets/avatars/notionists-06.png'),
  'avatar:notionists-07': require('@/assets/avatars/notionists-07.png'),
  'avatar:notionists-08': require('@/assets/avatars/notionists-08.png'),
  'avatar:notionists-09': require('@/assets/avatars/notionists-09.png'),
  'avatar:notionists-10': require('@/assets/avatars/notionists-10.png'),
  'avatar:notionists-11': require('@/assets/avatars/notionists-11.png'),
  'avatar:notionists-12': require('@/assets/avatars/notionists-12.png'),
  'avatar:notionists-13': require('@/assets/avatars/notionists-13.png'),
  'avatar:notionists-14': require('@/assets/avatars/notionists-14.png'),
  'avatar:notionists-15': require('@/assets/avatars/notionists-15.png'),
  'avatar:notionists-16': require('@/assets/avatars/notionists-16.png'),
  'avatar:notionists-17': require('@/assets/avatars/notionists-17.png'),
  'avatar:notionists-18': require('@/assets/avatars/notionists-18.png'),
  'avatar:notionists-19': require('@/assets/avatars/notionists-19.png'),
  'avatar:notionists-20': require('@/assets/avatars/notionists-20.png'),
  'avatar:notionists-21': require('@/assets/avatars/notionists-21.png'),
  'avatar:notionists-22': require('@/assets/avatars/notionists-22.png'),
  'avatar:notionists-23': require('@/assets/avatars/notionists-23.png'),
  'avatar:notionists-24': require('@/assets/avatars/notionists-24.png'),
  'avatar:notionists-25': require('@/assets/avatars/notionists-25.png'),
  'avatar:notionists-26': require('@/assets/avatars/notionists-26.png'),
  'avatar:notionists-27': require('@/assets/avatars/notionists-27.png'),
  'avatar:notionists-28': require('@/assets/avatars/notionists-28.png'),
  'avatar:notionists-29': require('@/assets/avatars/notionists-29.png'),
  'avatar:notionists-30': require('@/assets/avatars/notionists-30.png'),
};

/** All recognised avatar style names. */
export type AvatarStyle = 'adventurer' | 'notionists';

/**
 * Resolve an avatar key (e.g. `"avatar:adventurer-12"`) to a bundled
 * image source suitable for `<Image source={…} />`.
 *
 * Returns `null` when the key is `undefined`, empty, or not present in
 * the map — callers should fall-back to a placeholder in that case.
 */
export function getAvatarSource(
  key: string | undefined,
): ImageSourcePropType | null {
  if (!key) return null;
  return AVATAR_IMAGES[key] ?? null;
}

/**
 * Return the ordered list of all 30 avatar keys for a given style.
 *
 * Useful for rendering the picker grid.
 */
export function getAvatarKeys(style: AvatarStyle): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return `avatar:${style}-${num}`;
  });
}

/**
 * Get the image source for a **known** avatar key.
 *
 * Unlike `getAvatarSource`, this throws if the key is not found —
 * use it only in contexts where the key is guaranteed valid (e.g.
 * iterating over `getAvatarKeys()`).
 */
export function getAvatarImage(key: string): ImageSourcePropType {
  const source = AVATAR_IMAGES[key];
  if (!source) {
    throw new Error(`Unknown avatar key: "${key}"`);
  }
  return source;
}
