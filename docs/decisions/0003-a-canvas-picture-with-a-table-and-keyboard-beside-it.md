# 0003: A canvas picture, with a table and a keyboard model beside it

Status: accepted

## Context

A force-directed network is the point of the project, and it is a picture. Pictures are not available to screen reader
users, are hard to use without a mouse, and can be hard to read for people with low vision or colour blindness.

## Decision

- The picture is drawn on a canvas with `d3-force` for the layout, with my own drawing, pan, zoom and hit-testing, so the
  bundle carries one small library and not a graph framework. The drawing code takes a minimal canvas interface so it can
  be tested with a recording stand-in.
- Everything the picture shows is also in a table: each person, their papers in the view, the papers they share with the
  chosen person, their country or group, and a button to add or remove their collaborators. The key lists colours in
  words and counts.
- The picture can be driven from the keyboard (arrow keys to move between people, Enter to load collaborators,
  plus, minus and 0 to zoom and fit, Escape to clear) and has real zoom buttons. It is a `role="application"` widget
  with a name and a description of its controls. The canvas itself is hidden from assistive technology.
- Colours start from the Okabe-Ito colour-blind-safe set, lightened for a dark background and extended to seven, and a test
  checks that each is at least 3:1 against it. I have not simulated colour blindness on the modified set, so colour is never
  the only carrier: the table and the key repeat it in words, and size and rings carry the rest.
- With "reduce motion" set, the layout is computed at once without animation.
- On touch screens vertical drags scroll the page instead of being taken by the picture, so it cannot trap a scroll.

## Consequences

- Two accessibility lint rules disagree with `role="application"` on a focusable element, and the rule that complains
  cannot be configured by role, so there is one targeted disable with the reason beside it.
- Screen reader testing has not been done. The table is the primary route for that group.
