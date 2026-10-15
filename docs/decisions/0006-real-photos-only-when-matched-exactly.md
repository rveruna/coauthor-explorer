# 0006: Real photos only when matched exactly, otherwise initials

Status: accepted

## Context

A network of faces is far more engaging than a network of dots. But OpenAlex, the source of the data, has no photos,
and the earlier version of this project gave every researcher a random stock portrait chosen by a hash of their id.
Those were all of men, and none of them was the person: putting a made-up face on a real researcher misrepresents them.

## Decision

- **Never use a stand-in face.** A person either has a real photo or shows their initials.
- **Match by ORCID iD, never by name.** One query to Wikidata (`query.wikidata.org`, which allows browser requests) asks
  for the image (`P18`) of every person on screen whose ORCID iD (`P496`) is known. A name match could easily attach the
  wrong person's picture to a common name. The iDs are checked against the ORCID format before being put in the query.
- **Send as little as needed.** One request per network, by POST so a long list is not a problem, cached for a day, and
  skipped when nobody has an ORCID iD. The photos themselves are small Commons thumbnails fetched with no referrer.
- **Give credit.** Wikimedia Commons photos carry their own licences, which usually need the author named. The details
  panel shows the photo with a link to its Commons page, which gives the author and licence, and the footer says where
  photos come from.
- **Failure is quiet.** If Wikidata cannot be reached, nothing changes except that everyone shows initials.
- On the canvas a photo is cropped square towards the top, clipped to the circle, and given a ring in the colour of the
  person's country or group, so the colour key still works. Initials are drawn inside every other circle that is big
  enough, which is also what lets the full names be saved for the chosen person and the bigger neighbours.

## Consequences

- Coverage is small. In three real networks, 21 of the 180 people shown (about 1 in 8) had a photo, because Wikidata has
  one only for notable researchers, and an ORCID iD is needed to match.
- Matching by ORCID will sometimes miss someone who has a photo but whose ORCID iD is not on their Wikidata item, which is
  the cost of never guessing.
- Photos are not in the saved copies, so they appear only when Wikidata and Commons can be reached.
