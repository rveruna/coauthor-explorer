import { initials } from './initials';

describe('initials', () => {
  it.each([
    ['Jennifer A. Doudna', 'JD'],
    ['Samuel H. Sternberg', 'SS'],
    ['Katalin Karikó', 'KK'],
    ['Tim Berners‐Lee', 'TB'],
    ['Madonna', 'M'],
    ['  ada   lovelace ', 'AL'],
    ['Jean-Paul Sartre', 'JS'],
    ['Émile Zola', 'ÉZ'],
    ['李 飞飞', '李飞'],
    ['', '?'],
    ['...', '?'],
    ['Person A1000', 'PA'],
  ])('%s is %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
