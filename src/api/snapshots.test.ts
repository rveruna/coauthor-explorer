import { FEATURED, loadSnapshot, snapshotSchema } from './snapshots';

const files = import.meta.glob('../data/snapshots/*.json', { eager: true, import: 'default' });

describe('saved copies', () => {
  it('has one file for each featured researcher, and no others', () => {
    const fileIds = Object.keys(files).map((p) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length));
    expect(fileIds.sort()).toEqual(FEATURED.map((f) => f.id).sort());
  });

  it.each(FEATURED)('the copy for $name is in the expected shape', ({ id, name }) => {
    const parsed = snapshotSchema.safeParse(
      Object.entries(files).find(([p]) => p.endsWith(`/${id}.json`))?.[1],
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.id).toBe(id);
    expect(parsed.data.name.length).toBeGreaterThan(2);
    expect(name.length).toBeGreaterThan(2);
    expect(parsed.data.works.length).toBeGreaterThan(30);
  });

  it.each(FEATURED)('the copy for $name lists the researcher on every paper', async ({ id }) => {
    const snapshot = await loadSnapshot(id);

    expect(snapshot).not.toBeNull();
    for (const work of snapshot!.works) {
      expect(work.authors.some((a) => a.id === id)).toBe(true);
      expect(work.authors.every((a) => a.id.length > 0)).toBe(true);
    }
  });

  it('has a date for when each copy was made', async () => {
    const snapshot = await loadSnapshot(FEATURED[0]!.id);
    expect(snapshot!.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('has no copy for someone who is not featured', async () => {
    expect(await loadSnapshot('A1')).toBeNull();
  });
});
