# 0005: The URL for choices, the query cache for data

Status: accepted

## Context

There are two kinds of state. Papers come from a server, can be stale or fail, and are shared by several views. Choices
(who to start from, whose collaborators have been added, who is selected, the years, the limits, how to colour) belong to
the user and should survive a reload and travel in a link.

## Decision

- Papers are fetched and cached by TanStack Query, one entry per researcher, for an hour.
- Choices live in the URL and are read through a Zod schema, which falls back to a default for anything missing or not
  recognised, ignores ids that are not in the expected shape and limits the number of added researchers to six. Only
  values that differ from the defaults are written. Choosing a new starting researcher adds a history entry, so the back
  button returns to the last search, and smaller changes replace it.
- The network, the groups, the colours and the table are all computed from those two, with `useMemo`, and are not state.

## Consequences

- A link reproduces the view, and changing the years, limits or colours never makes a request.
- The `sel` value in a link is read only if that person is in the network, so a stale link cannot show details for
  someone who is not there.
