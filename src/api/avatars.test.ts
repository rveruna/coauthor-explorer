import { AVATAR_OPTIONS, loadAvatarMaker } from './avatars';

describe('loadAvatarMaker', () => {
  it('makes an SVG picture with a size, so a browser knows how big it is', async () => {
    const make = await loadAvatarMaker();

    const uri = make('A5067184382');

    expect(uri.startsWith('data:image/svg+xml')).toBe(true);
    const svg = decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
    expect(svg).toContain('width="160"');
    expect(svg).toContain('height="160"');
  });

  it('gives the same avatar for the same seed, and different ones for different seeds', async () => {
    const make = await loadAvatarMaker();

    expect(make('A1000')).toBe(make('A1000'));
    expect(make('A1000')).not.toBe(make('A2000'));
  });

  it('gives the same avatar from a fresh maker, so a person looks the same on every visit', async () => {
    const first = (await loadAvatarMaker())('A5030598859');
    const second = (await loadAvatarMaker())('A5030598859');

    expect(second).toBe(first);
  });

  it('makes many avatars quickly, since a network can show 200 people', async () => {
    const make = await loadAvatarMaker();
    const start = performance.now();

    for (let i = 0; i < 200; i++) make(`A${i}`);

    expect(performance.now() - start).toBeLessThan(2000);
  });
});

describe('the look of the avatars', () => {
  it.each(['pacifier', 'surprise', 'frown', 'bigSmile'])('leaves out the %s mouth', (mouth) => {
    expect(AVATAR_OPTIONS.mouth as readonly string[]).not.toContain(mouth);
  });

  it.each(['sleep', 'wink', 'sunglasses'])('leaves out the %s eyes', (eyes) => {
    expect(AVATAR_OPTIONS.eyes as readonly string[]).not.toContain(eyes);
  });

  it.each(['mohawk', 'pigtails', 'cap', 'beanie'])('leaves out the %s hair', (hair) => {
    expect(AVATAR_OPTIONS.hair as readonly string[]).not.toContain(hair);
  });

  it('keeps every colour a plain six-digit hex value', () => {
    for (const c of [...AVATAR_OPTIONS.clothingColor, ...AVATAR_OPTIONS.backgroundColor])
      expect(c).toMatch(/^[0-9a-f]{6}$/);
  });

  it('still gives a variety of people', async () => {
    const make = await loadAvatarMaker();
    const distinct = new Set(Array.from({ length: 60 }, (_, i) => make(`A${i}`)));

    expect(distinct.size).toBe(60);
  });
});
