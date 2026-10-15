# Co-author Explorer

[![CI](https://github.com/rveruna/coauthor-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/rveruna/coauthor-explorer/actions/workflows/ci.yml)
[![CodeQL](https://github.com/rveruna/coauthor-explorer/actions/workflows/codeql.yml/badge.svg)](https://github.com/rveruna/coauthor-explorer/actions/workflows/codeql.yml)

**[Live demo](https://rveruna.github.io/coauthor-explorer/)** (uses live data from OpenAlex)

Search for any researcher and see who they write papers with as a live, draggable network. Double-click a collaborator
to load _their_ collaborators into the same picture. Narrow the years to watch collaborations appear and disappear.
Switch to colouring by group and the network pulls apart into circles of people who write together.

It is a rebuild of an earlier project of mine that drew researcher networks and loaded profiles from the ORCID API. That
version used a small server to keep an API token private, which also meant it could not run as a static demo. This one
uses open data that needs no key, has tests, and also works without a mouse.

It is an independent project and is not affiliated with OpenAlex.

## What it does

- Searches researchers on OpenAlex and builds a co-authorship network from their 100 most cited papers
- Draws it on a canvas with a force layout: drag people, pan, zoom, hover to see who a person is linked to
- Expands any person, up to six at once, and merges their papers into the same network
- Filters by year range, ignores papers with huge author lists (adjustable, because they link everyone to everyone) and
  caps how many people are shown
- Colours people by country, or by **group**: circles of collaborators found automatically from who writes with whom
- Shows a real photo for people who have one (matched exactly by ORCID iD from Wikidata and Wikimedia Commons, with a credit
  link) and initials for everyone else. It never uses stand-in faces
- Shows a details panel (institution, totals from OpenAlex, links to their OpenAlex and ORCID pages, the papers they share
  with the starting person)
- Keeps every choice in the URL, so a link reproduces the view and the back button works
- Falls back to saved copies of real data for seven featured researchers when OpenAlex cannot be reached or its free daily
  limit has been used, and says so on the page

## Run it

```bash
npm install
npm run dev
npm test               # 307 tests
npm run test:coverage
npm run build
npm run lint
npm run size           # bundle budget, after a build
npm run perf:lighthouse
node scripts/snapshot.mjs   # refresh the saved copies
```

No key or token is needed.

## How it is built

```
src/
  domain/       papers, the graph builder, groups, layout, drawing, colours, settings (no React, tested alone)
  api/          the OpenAlex client with response validation, and the saved copies
  hooks/        URL-backed settings, data loading (TanStack Query), reduced motion
  components/   search, controls, canvas, details panel, table, key, status messages
scripts/        refreshes the saved copies from OpenAlex
docs/decisions/ the reasoning behind the main choices
```

- **Pure core.** `buildGraph`, `findGroups` and the layout and drawing code take plain data and are tested without a
  browser. The drawing takes a minimal canvas interface, so tests can use a recording stand-in.
- **Data and choices are kept apart.** Papers are cached by TanStack Query. Choices live in the URL. Changing the years,
  limits or colours never makes a request ([0005](docs/decisions/0005-state-the-url-and-the-query-cache.md)).
- **Responses are validated** with Zod, and failures are told apart as network, rate limit, not found, server error or
  unreadable ([0001](docs/decisions/0001-openalex-with-no-key-and-saved-copies.md)).

## Accessibility

A picture of a network cannot be read by a screen reader, so the picture is not the only way in
([0003](docs/decisions/0003-a-canvas-picture-with-a-table-and-keyboard-beside-it.md)):

- A table lists every person with their papers, the papers they share with the chosen person, their country or group, and
  buttons to add or remove their collaborators. The key and the group names say in words what the colours show.
- The picture can be driven from the keyboard (arrow keys, Enter, plus, minus, 0, Escape) and has zoom buttons.
- Palette contrast is tested at 3:1 against the dark background, and axe finds no violations in the tests or in real
  Chrome (including colour contrast), and Lighthouse accessibility is 100.
- With "reduce motion" set, the layout is computed at once and does not animate.
- On touch screens vertical drags scroll the page and are not trapped by the picture.
- I have not tested with a screen reader, and I have not simulated colour blindness on the palette.

## Practices

- **Tests:** 307 (Vitest, Testing Library, MSW for the network). Coverage is about 98% of statements and 94% of branches.
  They include the real-data shapes below, pointer and keyboard use of the canvas, search with the combobox keys,
  falling back to saved copies, and a check that every saved copy has the expected shape.
- **Mutation check:** I made 32 deliberate changes to the graph builder, groups, colours, viewport, settings, schema,
  drawing, photo matching and fallback logic. The first runs missed 5 (a tie-break in group finding, label priority when
  names collide, which person the table compares against, the check that a photo address is a Commons file, and the cap on
  how many people are looked up for photos), so I wrote tests for them, and now all 32 are caught. The script is a one-off
  and is not in the repo.
- **Bugs found while building, in my own work:**
  - Real OpenAlex data has credits with no author id (5 to 47 of a researcher's 100 papers). The first schema rejected the
    whole response. Mocked tests could not have shown it; running against the live API did.
  - The sliders' labels were attached to the `<output>` element instead of the slider, so they had no name.
  - Sorting by country put people with no country first.
  - Group clustering did nothing at first, because d3 reads a force's strength only when the nodes are assigned.
  - The page scrolled sideways on a phone because hidden helper text escaped the table's scroll box, and a finger on the
    picture could not scroll the page.
- **Quality gates in CI:** an audit of production dependencies, lint, a Prettier check, the build, the tests with
  coverage, a bundle budget and Lighthouse with minimum scores. A pre-commit hook formats and lints staged files.
  Dependabot and CodeQL are on.
- **Performance:** [docs/performance.md](docs/performance.md). Lighthouse gives 99, 100, 100, 100 on simulated Slow 4G
  at the starting screen, with 120 kB of JavaScript.

## Limits and what I would improve

- **OpenAlex's free allowance.** Without a key the daily allowance is small and the app has no way to raise it. It copes
  by saying so and using saved copies, but search and anyone outside the seven featured researchers need the live service.
  I did not confirm whether the allowance is counted per visitor or shared.
- **OpenAlex's terms.** I could not find a statement of the dataset's licence on OpenAlex's own pages (secondary sources
  describe it as CC0). The saved copies contain only names, titles, years, citation counts and who was credited. Check
  their terms before reusing them.
- **Author matching is automatic and imperfect.** OpenAlex sometimes merges or splits people, for example one well-known
  researcher has three profiles, and the app uses the one with the most works.
- **Photos are rare.** About 1 in 8 of the people shown had one in the networks I tried, because Wikidata has photos only
  for notable researchers and a person needs an ORCID iD to be matched. Everyone else shows initials. Each photo's author
  and licence are on its Commons page, which the details panel links to.
- **Only the 100 most cited papers** of each researcher are loaded, so "papers" means papers in that sample, and recent or
  less cited work is under-represented. Loading more would mean paging and more requests.
- **Groups are a guide.** Label propagation is quick and simple, not the best community-finding method, and the groups
  change as the years and limits change.
- **The layout runs on the main thread.** It is fine for 200 people. Beyond that, it should move to a worker.
- **Not tested on real touch devices or with a screen reader.**
