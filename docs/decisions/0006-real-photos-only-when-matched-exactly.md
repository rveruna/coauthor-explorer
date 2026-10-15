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
- **Failure is quiet.** If Wikidata cannot be reached, nothing changes except that everyone shows an avatar.
- **Illustrated avatars for everyone else.** The Personas style by Draftbit (CC BY 4.0, credited in the footer), drawn in
  the browser by DiceBear (MIT), made from the person's OpenAlex id. Nothing is requested from a server and no name is
  used, the same person always gets the same avatar, and generating 200 takes about 14 ms. They are flat illustrations,
  which no one mistakes for a photo, and the page says so: the key, the footer and a caption in the details panel. The
  avatar is decorative to a screen reader, so it is the caption that is announced. A real photo always wins over an avatar.
- **A professional range.** I first used the Notionists style, which looked playful and was too silly for a portfolio, so
  I compared six styles side by side and chose Personas. It also offers a pacifier, a mohawk, pigtails, winks, sleeping
  eyes and neon clothing, so the avatars are restricted to plain expressions, ordinary hair and a muted clothing palette,
  and a test checks that the silly options stay out. Glasses are made rarer by listing them once among five eye choices.
- On the canvas a face is cropped square towards the top, clipped to the circle, and given a ring in the colour of the
  person's country or group, so the colour key still works. Circles are larger than before (10 plus a share for papers, up
  to 28) so that every face is big enough to read. Initials remain as the fallback until an avatar has loaded, which also
  lets full names be saved for the chosen person and the bigger neighbours.

## Consequences

- Real photos are rare. In three real networks, 21 of the 180 people shown (about 1 in 8) had one, because Wikidata has
  one only for notable researchers, and an ORCID iD is needed to match.
- Matching by ORCID will sometimes miss someone who has a photo but whose ORCID iD is not on their Wikidata item, which is
  the cost of never guessing.
- Photos are not in the saved copies, so they appear only when Wikidata and Commons can be reached. Avatars need nothing.
- The avatar library is about 11 kB gzipped, a separate file fetched once a network is first shown and not counted in the
  up-front budget. (The Notionists style was about 117 kB, which was another reason to change.)
- Avatars say nothing about the person. Nothing is read from the name, so they do not guess gender, ethnicity or age.
  Personas does draw a range of skin tones, ages and hair, and which one a person gets is arbitrary, which is why the page
  says they are not real faces.
- CC BY 4.0 needs attribution, which the footer gives with links to Draftbit and to the licence.
