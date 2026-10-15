import { paper } from '../test/works';
import { openAlexAuthorUrl, openAlexWorkUrl, sharedWorks } from './works';

describe('sharedWorks', () => {
  const works = [
    paper('w1', 2020, ['a', 'b'], 5),
    paper('w2', 2021, ['a', 'c'], 50),
    paper('w3', 2022, ['a', 'b', 'c'], 20),
    paper('w4', 2019, ['a', 'b'], 20),
  ];

  it('lists only the papers both people are on', () => {
    expect(sharedWorks(works, 'a', 'b').map((w) => w.id)).toEqual(['w3', 'w4', 'w1']);
  });

  it('puts the most cited first, then the newest, then by id', () => {
    const tied = [
      paper('b', 2020, ['x', 'y'], 1),
      paper('a', 2020, ['x', 'y'], 1),
      paper('c', 2021, ['x', 'y'], 1),
    ];
    expect(sharedWorks(tied, 'x', 'y').map((w) => w.id)).toEqual(['c', 'a', 'b']);
  });

  it('lists a paper once even when it was loaded twice', () => {
    expect(sharedWorks([works[0]!, works[0]!], 'a', 'b')).toHaveLength(1);
  });

  it('is empty when the two never wrote together', () => {
    expect(sharedWorks(works, 'b', 'zzz')).toEqual([]);
  });
});

describe('OpenAlex links', () => {
  it('point to the author and work pages', () => {
    expect(openAlexAuthorUrl('A1')).toBe('https://openalex.org/authors/A1');
    expect(openAlexWorkUrl('W2')).toBe('https://openalex.org/works/W2');
  });
});
