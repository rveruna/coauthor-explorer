import { useQuery } from '@tanstack/react-query';
import { loadAvatarMaker } from '../api/avatars';
import type { GraphNode } from '../domain/graph';

/**
 * Illustrated avatars, by node id, for the people who have no real photo. They are made from the person's OpenAlex
 * id, so they are stable and carry no name. They are illustrations, and the page says so.
 */
export function useAvatars(nodes: GraphNode[], hasPhoto: (id: string) => boolean): Map<string, string> {
  const maker = useQuery({
    queryKey: ['avatar-maker'],
    queryFn: loadAvatarMaker,
    staleTime: Infinity,
    retry: false,
  });
  const avatars = new Map<string, string>();
  if (!maker.data) return avatars;
  for (const node of nodes) if (!hasPhoto(node.id)) avatars.set(node.id, maker.data(node.id));
  return avatars;
}
