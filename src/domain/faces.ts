/** The picture to show for each person: their real photo if they have one, otherwise their illustrated avatar. */
export function mergeFaces(
  avatars: Map<string, string>,
  photoUrls: Map<string, string>,
): Map<string, string> {
  const faces = new Map(avatars);
  for (const [id, url] of photoUrls) faces.set(id, url);
  return faces;
}
