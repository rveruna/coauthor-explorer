import { mergeFaces } from './faces';

describe('mergeFaces', () => {
  it('uses a real photo instead of an avatar for the same person', () => {
    const faces = mergeFaces(
      new Map([
        ['a', 'avatar-a'],
        ['b', 'avatar-b'],
      ]),
      new Map([['a', 'photo-a']]),
    );

    expect(faces.get('a')).toBe('photo-a');
    expect(faces.get('b')).toBe('avatar-b');
  });

  it('includes people who have only a photo', () => {
    expect(mergeFaces(new Map(), new Map([['c', 'photo-c']])).get('c')).toBe('photo-c');
  });

  it('is empty when nobody has a face', () => {
    expect(mergeFaces(new Map(), new Map()).size).toBe(0);
  });

  it('does not change the maps it is given', () => {
    const avatars = new Map([['a', 'avatar-a']]);
    mergeFaces(avatars, new Map([['a', 'photo-a']]));
    expect(avatars.get('a')).toBe('avatar-a');
  });
});
