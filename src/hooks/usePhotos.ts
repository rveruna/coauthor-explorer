import { useQuery } from '@tanstack/react-query';
import { fetchPhotos, orcidIds, type Photo } from '../api/wikidata';
import type { GraphNode } from '../domain/graph';

const DAY = 24 * 60 * 60 * 1000;
const MAX_PEOPLE = 200;

/**
 * Real photos, by node id, for the people in the network who have one on Wikidata. It never guesses from a name:
 * a photo is shown only when the person's ORCID iD matches exactly.
 */
export function usePhotos(nodes: GraphNode[]): Map<string, Photo> {
  const wanted = nodes.filter((n) => n.orcid).slice(0, MAX_PEOPLE);
  const ids = orcidIds(wanted.map((n) => n.orcid)).sort();
  const query = useQuery({
    queryKey: ['photos', ids],
    queryFn: ({ signal }) => fetchPhotos(ids, signal),
    enabled: ids.length > 0,
    staleTime: DAY,
    gcTime: DAY,
    retry: false,
  });

  const byNode = new Map<string, Photo>();
  if (!query.data) return byNode;
  for (const node of wanted) {
    const id = node.orcid!.slice(node.orcid!.lastIndexOf('/') + 1);
    const photo = query.data.get(id);
    if (photo) byNode.set(node.id, photo);
  }
  return byNode;
}
