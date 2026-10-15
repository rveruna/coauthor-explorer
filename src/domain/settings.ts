import { z } from 'zod';

export const NODE_LIMITS = [30, 60, 120, 200] as const;
export const MAX_EXPANDED = 6;

const authorId = z.string().regex(/^A\d{4,}$/);

/** A comma-separated list of author ids, ignoring anything that is not one, without repeats, up to a limit. */
const idList = z
  .string()
  .optional()
  .transform((value) => {
    const ids = (value ?? '').split(',').filter((id) => authorId.safeParse(id).success);
    return [...new Set(ids)].slice(0, MAX_EXPANDED);
  });

const year = z.coerce.number().int().min(1800).max(2100).optional().catch(undefined);

/** What the user has chosen. Anything missing or not recognised in the URL falls back to its default. */
export const settingsSchema = z.object({
  a: authorId.optional().catch(undefined),
  x: idList,
  sel: authorId.optional().catch(undefined),
  from: year,
  to: year,
  color: z.enum(['country', 'group']).catch('country'),
  max: z.coerce.number().int().min(3).max(50).catch(12),
  nodes: z.coerce
    .number()
    .refine((n) => (NODE_LIMITS as readonly number[]).includes(n))
    .catch(60),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

export function parseSettings(search: string): Settings {
  return settingsSchema.parse(Object.fromEntries(new URLSearchParams(search)));
}

/** Writes only what differs from the defaults, so a shared link stays short. */
export function settingsToSearch(settings: Settings): string {
  const params = new URLSearchParams();
  if (settings.a) params.set('a', settings.a);
  if (settings.x.length > 0) params.set('x', settings.x.join(','));
  if (settings.sel) params.set('sel', settings.sel);
  if (settings.from !== undefined) params.set('from', String(settings.from));
  if (settings.to !== undefined) params.set('to', String(settings.to));
  if (settings.color !== DEFAULT_SETTINGS.color) params.set('color', settings.color);
  if (settings.max !== DEFAULT_SETTINGS.max) params.set('max', String(settings.max));
  if (settings.nodes !== DEFAULT_SETTINGS.nodes) params.set('nodes', String(settings.nodes));
  const text = params.toString();
  return text ? `?${text}` : '';
}
