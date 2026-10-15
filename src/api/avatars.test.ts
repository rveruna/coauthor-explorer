import { loadAvatarMaker } from './avatars';

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
