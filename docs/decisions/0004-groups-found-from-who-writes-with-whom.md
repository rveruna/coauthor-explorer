# 0004: Groups found from who writes with whom

Status: accepted

## Context

Colouring by country is easy to explain but often shows one colour. A more interesting question is which circles of
people write together.

## Decision

- Find groups by label propagation: everyone starts alone and repeatedly joins the group most of their collaborators
  (weighted by shared papers) are in. People are visited in id order and ties go to the smaller label, so the result is the
  same every time, and a test checks it does not depend on the order the papers arrive in.
- **Leave out the people whose own papers were loaded** while searching. They are linked to nearly everyone by
  construction, and with them in, every group collapses into one. They are afterwards placed with the group they share
  the most papers with.
- Only groups of two or more people get a colour; the rest share a neutral one. At most seven coloured groups.
- Each group is named after its member with the most papers ("Around …"), and the table has a column with the same
  words, so the grouping is available without colour.
- When colouring by group, the layout pulls each coloured group towards its own place on a ring, which makes the
  circles visibly separate. People who were expanded are left free.

## Consequences

- Label propagation is simple and fast, and its groups are a guide, not a ground truth. They change when the year range
  or the limits change, which the page does not hide.
- A bug found while building this: d3 works out a force's strength only when nodes are assigned, so setting anchors
  after assigning the nodes did nothing. It was found by a test that the groups really move, and is fixed by assigning the
  nodes again when the anchors change.
