import { DEFAULT_SETTINGS, MAX_EXPANDED, parseSettings, settingsToSearch } from './settings';

describe('parseSettings', () => {
  it('has no seed, 12 authors per paper and 60 people by default', () => {
    expect(parseSettings('')).toEqual({
      a: undefined,
      x: [],
      sel: undefined,
      from: undefined,
      to: undefined,
      color: 'country',
      max: 12,
      nodes: 60,
    });
  });

  it('reads valid values', () => {
    expect(
      parseSettings('?a=A5023888391&x=A1234,A5678&sel=A1234&from=2005&to=2020&color=group&max=20&nodes=120'),
    ).toEqual({
      a: 'A5023888391',
      x: ['A1234', 'A5678'],
      sel: 'A1234',
      from: 2005,
      to: 2020,
      color: 'group',
      max: 20,
      nodes: 120,
    });
  });

  it.each([
    ['a seed that is not an author id', '?a=hello', 'a', undefined],
    ['a lower-case id', '?a=a5023888391', 'a', undefined],
    ['an id with a script in it', '?sel=A1234<script>', 'sel', undefined],
    ['a year that is not a number', '?from=soon', 'from', undefined],
    ['a year far in the past', '?from=12', 'from', undefined],
    ['a colour mode that does not exist', '?color=rainbow', 'color', 'country'],
    ['too few authors per paper', '?max=1', 'max', 12],
    ['too many authors per paper', '?max=500', 'max', 12],
    ['a node limit that is not offered', '?nodes=7', 'nodes', 60],
  ] as const)('falls back for %s', (_name, search, key, expected) => {
    expect(parseSettings(search)[key]).toBe(expected);
  });

  it('keeps only valid ids in the expanded list, without repeats', () => {
    expect(parseSettings('?x=A1234,nope,A1234,A9999,').x).toEqual(['A1234', 'A9999']);
  });

  it(`keeps at most ${MAX_EXPANDED} expanded people`, () => {
    const ids = Array.from({ length: 10 }, (_, i) => `A${1000 + i}`).join(',');
    expect(parseSettings(`?x=${ids}`).x).toHaveLength(MAX_EXPANDED);
  });
});

describe('settingsToSearch', () => {
  it('writes nothing for the defaults', () => {
    expect(settingsToSearch(DEFAULT_SETTINGS)).toBe('');
  });

  it('writes only what differs', () => {
    expect(settingsToSearch({ ...DEFAULT_SETTINGS, a: 'A1234', max: 8 })).toBe('?a=A1234&max=8');
  });

  it('round-trips every choice', () => {
    const settings = {
      a: 'A5023888391',
      x: ['A1234', 'A5678'],
      sel: 'A1234',
      from: 2001,
      to: 2022,
      color: 'group' as const,
      max: 25,
      nodes: 200,
    };
    expect(parseSettings(settingsToSearch(settings))).toEqual(settings);
  });
});
