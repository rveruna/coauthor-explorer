/** Makes an illustrated avatar from a seed, as a data address an image can load. */
export type AvatarMaker = (seed: string) => string;

/** The size the avatars are made at, in pixels. Without one, browsers treat the picture as having no natural size. */
const SIZE = 160;

/**
 * Loads the avatar generator when it is first needed, so it is not part of the page every visitor downloads. The
 * avatars are drawn in the browser from the seed, so nothing is requested from a server and no name is sent anywhere.
 * The same seed always gives the same avatar.
 */
export async function loadAvatarMaker(): Promise<AvatarMaker> {
  const [{ createAvatar }, style] = await Promise.all([
    import('@dicebear/core'),
    import('@dicebear/notionists'),
  ]);
  const cache = new Map<string, string>();
  return (seed) => {
    let uri = cache.get(seed);
    if (uri === undefined) {
      uri = createAvatar(style, { seed, size: SIZE }).toDataUri();
      cache.set(seed, uri);
    }
    return uri;
  };
}
