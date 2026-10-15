/** Makes an illustrated avatar from a seed, as a data address an image can load. */
export type AvatarMaker = (seed: string) => string;

/** The size the avatars are made at, in pixels. Without one, browsers treat the picture as having no natural size. */
const SIZE = 160;

/**
 * The look of the avatars: the Personas style, held to a plain, professional range. The style also offers a pacifier,
 * a mohawk, pigtails, winks and sleeping eyes, which do not suit a researcher network, and neon clothing, so those are left
 * out. Which of the remaining options a person gets depends only on their seed.
 */
export const AVATAR_OPTIONS = {
  size: SIZE,
  // the style picks one of these at random, so repeats make glasses rarer
  eyes: ['open', 'open', 'happy', 'happy', 'glasses'],
  mouth: ['smile', 'smirk', 'lips'],
  body: ['squared', 'rounded', 'checkered'],
  hair: [
    'long',
    'sideShave',
    'shortCombover',
    'curlyHighTop',
    'bobCut',
    'curly',
    'curlyBun',
    'buzzcut',
    'bobBangs',
    'bald',
    'balding',
    'bunUndercut',
    'fade',
    'straightBun',
    'extraLong',
    'shortComboverChops',
  ],
  clothingColor: ['3f5f8a', '5b7b6f', '7a5c8a', '8a6a4f', '4a5568', 'a05a5a'],
  backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
} as const;

/**
 * Loads the avatar generator when it is first needed, so it is not part of the page every visitor downloads. The
 * avatars are drawn in the browser from the seed, so nothing is requested from a server and no name is sent anywhere.
 * The same seed always gives the same avatar.
 */
export async function loadAvatarMaker(): Promise<AvatarMaker> {
  const [{ createAvatar }, style] = await Promise.all([
    import('@dicebear/core'),
    import('@dicebear/personas'),
  ]);
  const cache = new Map<string, string>();
  return (seed) => {
    let uri = cache.get(seed);
    if (uri === undefined) {
      uri = createAvatar(style, {
        seed,
        ...AVATAR_OPTIONS,
        eyes: [...AVATAR_OPTIONS.eyes],
        mouth: [...AVATAR_OPTIONS.mouth],
        body: [...AVATAR_OPTIONS.body],
        hair: [...AVATAR_OPTIONS.hair],
        clothingColor: [...AVATAR_OPTIONS.clothingColor],
        backgroundColor: [...AVATAR_OPTIONS.backgroundColor],
      }).toDataUri();
      cache.set(seed, uri);
    }
    return uri;
  };
}
