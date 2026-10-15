# 0006: Real photos only when matched exactly, otherwise a labelled illustration

Status: accepted

## Context

A network of faces is far more engaging than a network of dots. But OpenAlex, the source of the data, has no photos,
and the earlier version of this project gave every researcher a random stock portrait chosen by a hash of their id.
Those were all of men, and none of them was the person: putting a made-up face on a real researcher misrepresents them.

## Decision

- **Never use a stand-in photograph.** A person either has a real photo, or an illustration that is plainly an illustration.
  The first version of this decision used initials for everyone without a photo. Initials were honest but looked empty, so
  they were replaced by illustrated avatars, which are just as honest if they are labelled.
- **Match by ORCID iD, never by name.** One query to Wikidata (`query.wikidata.org`, which allows browser requests) asks
  for the image (`P18`) of every person on screen whose ORCID iD (`P496`) is known. A name match could easily attach the
  wrong person's picture to a common name. The iDs are checked against the ORCID format before being put in the query.
- **Send as little as needed.** One request per network, by POST so a long list is not a problem, cached for a day, and
  skipped when nobody has an ORCID iD. The photos themselves are small Commons thumbnails fetched with no referrer.
- **Give credit.** Wikimedia Commons photos carry their own licences, which usually need the author named. The details
  panel shows the photo with a link to its Commons page, which gives the author and licence, and the footer says where
  photos come from.
- **Failure is quiet.** If Wikidata cannot be reached, nothing changes except that everyone shows initials.
- **Illustrated avatars for everyone else.** The Notionists style by Zoish (CC0), drawn in the browser by DiceBear (MIT),
  made from the person's OpenAlex id. Nothing is requested from a server and no name is used, the same person always gets the
  same avatar, and generating 200 takes about 14 ms. They are line drawings, which no one mistakes for a photo, and the page
  says so: the key, the footer and a caption in the details panel (the avatar is decorative to a screen reader, so it
  is the caption that is announced). A real photo always wins over an avatar.
- On the canvas a face is cropped square towards the top, clipped to the circle, and given a ring in the colour of the
  person's country or group, so the colour key still works. Circles are larger than before (10 plus a share for papers, up to 28) so that every face is big enough to read. Initials remain as the fallback until an avatar has loaded, which also lets
  full names be saved for the chosen person and the bigger neighbours.

## Consequences

- Coverage is small. In three real networks, 21 of the 180 people shown (about 1 in 8) had a photo, because Wikidata has
  one only for notable researchers, and an ORCID iD is needed to match.
- Matching by ORCID will sometimes miss someone who has a photo but whose ORCID iD is not on their Wikidata item, which is
  the cost of never guessing.
- Photos are not in the saved copies, so they appear only when Wikidata and Commons can be reached. Avatars need nothing.
- The avatar library is about 117 kB gzipped. It is a separate file, fetched once a network is first shown, and is not
  counted in the up-front budget, but it is a real cost on a slow connection.
- Avatars say nothing about the person. They do not guess gender, ethnicity or age from a name, because nothing is read
  from the name.
