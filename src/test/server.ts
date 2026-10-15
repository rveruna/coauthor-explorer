import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/** Photos are an extra, so unless a test says otherwise nobody has one. */
export const server = setupServer(
  http.post('https://query.wikidata.org/sparql', () => HttpResponse.json({ results: { bindings: [] } })),
);
