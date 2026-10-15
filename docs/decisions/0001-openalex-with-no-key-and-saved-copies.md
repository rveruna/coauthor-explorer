# 0001: Use OpenAlex with no key, and fall back to saved copies

Status: accepted

## Context

The project this replaces used the ORCID API through a small server that held a token, which meant it could not run
as a free static demo. A co-author network needs papers with every author listed, and ORCID's public API returns a
person's own record, not the people they wrote with.

## Decision

- Use the OpenAlex REST API, called straight from the browser. It allows any origin and needs no key for basic use,
  and each paper lists its authors, their ORCID where OpenAlex knows it, and their countries.
- Ship no key. Anything in browser code can be read by every visitor, so a key there could be copied and used up.
  The free allowance without a key is small (the response headers showed about 1,000 requests a day, about $0.10,
  resetting at midnight UTC). I did not confirm whether that allowance is counted per visitor or shared, so the app
  has to cope with running out.
- Keep the number of requests low: one for a researcher's 100 most cited papers, one for the details panel, and the
  search. Results are cached for an hour.
- Bundle saved copies of real OpenAlex data for seven well-known researchers (`scripts/snapshot.mjs`). When a request
  fails because of the limit or the network, a saved copy is used if there is one, and the page says so and gives the
  date. A saved copy is tried against the live service again as soon as it is asked for.

## Consequences

- The app works as a static site with no server and no secret.
- Search needs the live service. When it is unavailable the page says so and the featured researchers still work.
- OpenAlex's own pages did not say, where I looked, what licence the dataset is under. Secondary sources describe it as
  CC0. The saved copies hold only bibliographic facts, and the README says to check OpenAlex's terms before reusing them.
- The saved copies are a point in time and will drift from the live data.
