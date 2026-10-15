# 0002: How the network is built from papers, and what it leaves out

Status: accepted

## Context

A co-authorship network is easy to draw and easy to make meaningless. Real data has several traps, and the first
version of this app hit one of them: it assumed every credit on a paper names an author record.

## Decision

`buildGraph` (a pure function in `src/domain/graph.ts`) turns papers into people and links:

- A link between two people counts the papers they share. A person is counted once per paper even if they are credited
  twice, and a paper loaded twice counts once.
- **Credits with no author record are left out.** In live data, between 5% and 47% of a researcher's most cited papers
  had at least one credit with a null author id. The first schema required an id, so one such paper made the whole
  response "invalid". It was found by running against the real API, not by the mocked tests, and is now covered by tests.
- **Papers with more authors than a limit are ignored** (12 by default, up to 50, adjustable). A paper with 3,000 authors
  links everyone to everyone, which says almost nothing about who works together. The page says how many papers are
  being ignored.
- **At most 30 to 200 people are shown**, keeping those whose own papers were loaded and then those with the most
  papers. The page says how many are hidden.
- The years can be narrowed, and the network is rebuilt from the same papers, so no new request is made.

## Consequences

- "Papers" means papers in the data and the year range, which is a researcher's 100 most cited papers, not everything
  they wrote. The page says "most cited papers".
- OpenAlex matches authors automatically, and sometimes merges or splits people (one well-known researcher has three
  profiles). The footer says so.
