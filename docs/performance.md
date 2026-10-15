# Performance

Measured with `npm run perf:lighthouse` (median of 3 runs, mobile emulation, simulated Slow 4G, Chrome) on a production
build, opened at the starting screen. That screen makes no request to OpenAlex, so the numbers describe the app and not
the API.

| Measure                            | Result                  |
| ---------------------------------- | ----------------------- |
| Performance score                  | 99                      |
| Accessibility, best practices, SEO | 100, 100, 100           |
| First contentful paint             | 1.5 s                   |
| Largest contentful paint           | 1.65 s                  |
| Total blocking time                | 0 ms                    |
| Layout shift                       | 0                       |
| Page weight                        | 122 kB (scripts 118 kB) |

`npm run size` fails the build if the gzipped JavaScript that the page loads up front passes 130 kB or the CSS passes
3 kB. Today's figures are 122.3 kB and 1.7 kB. Everything else is loaded later and not counted: the seven saved copies of
researchers' data (108 kB gzipped in total, only when OpenAlex cannot be reached) and the avatar library (about 117 kB, once a
network is first shown).

Not measured: how it behaves with the network drawn and the layout running (Lighthouse does not exercise that), the
speed of OpenAlex itself, or a real phone.
