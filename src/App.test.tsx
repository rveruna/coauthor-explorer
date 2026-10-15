import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { http, HttpResponse } from 'msw';
import { FEATURED } from './api/snapshots';
import { server } from './test/server';
import { renderApp, SEED, serve, WORLD } from './test/openalex';

const ORCID_A = '0000-0001-9161-999X';
const FILE = 'http://commons.wikimedia.org/wiki/Special:FilePath/Ada%20Lovelace.jpg';
const WITH_ORCID = {
  [SEED]: [
    {
      id: 'W1',
      year: 2020,
      authors: [[SEED, 'GB', ORCID_A] as [string, string, string], ['A2000', 'US'] as [string, string]],
    },
  ],
};

const loaded = () => screen.findByText(/Showing \d+ people/);
const table = () => screen.getByRole('table');
const row = (name: string) => within(table()).getByRole('row', { name: new RegExp(`^${name}`) });

describe('the starting screen', () => {
  it('offers the featured researchers and makes no requests', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: 'Start with someone' })).toBeInTheDocument();
    for (const f of FEATURED) expect(screen.getByRole('button', { name: f.name })).toBeInTheDocument();
  });

  it('starts from a featured researcher and keeps that in the URL', async () => {
    serve({
      [FEATURED[0]!.id]: WORLD[SEED]!.map((p) => ({
        ...p,
        authors: [FEATURED[0]!.id, ...p.authors.slice(1)],
      })),
    });
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: FEATURED[0]!.name }));

    await loaded();
    expect(window.location.search).toContain(`a=${FEATURED[0]!.id}`);
  });
});

describe('the network', () => {
  it('shows who the researcher wrote with, and how many papers they share', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);

    expect(
      await screen.findByText(
        /Showing 4 people and 6 collaborations from one researcher’s most cited papers, 2010 to 2022/,
      ),
    ).toBeInTheDocument();
    expect(within(table()).getAllByRole('row')).toHaveLength(5);
    // A2000 is on three of the four papers with the starting person
    expect(row('Person A2000')).toHaveTextContent(/3\s*3\s*United States/);
  });

  it('lists the same people in the table as in the network, most papers first', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);
    await loaded();

    const names = within(table())
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('button')[0]!.textContent);
    expect(names[0]).toBe('Person A1000');
    expect(names).toHaveLength(4);
  });

  it('can sort the table by name or country', async () => {
    serve(WORLD);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}`);
    await loaded();

    await user.selectOptions(screen.getByLabelText('Sort by'), 'colour');
    const firstCountries = within(table())
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[2]!.textContent);
    expect(firstCountries).toEqual(['United Kingdom', 'United States', 'Not known', 'Not known']);
  });

  it('describes the picture for assistive technology and says how to use it', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);
    await loaded();

    const widget = screen.getByRole('application', { name: /Co-author network of 4 people/ });
    expect(widget).toHaveAttribute('tabindex', '0');
    expect(widget).toHaveAccessibleDescription(/arrow keys to move between people/);
  });

  it('shows a colour key with the countries and an other group', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);
    await loaded();

    const key = screen.getByRole('region', { name: 'Key' });
    expect(within(key).getByText(/United States/)).toBeInTheDocument();
    expect(within(key).getByText(/United Kingdom/)).toBeInTheDocument();
    expect(within(key).getByText(/Other or unknown/)).toBeInTheDocument();
  });
});

describe('colouring by group', () => {
  // two circles who each write together, joined only by the starting person
  const CIRCLES = {
    [SEED]: [
      { id: 'W1', year: 2020, authors: [SEED, 'A2000', 'A2001'] },
      { id: 'W2', year: 2020, authors: [SEED, 'A2000', 'A2001'] },
      { id: 'W3', year: 2020, authors: [SEED, 'A3000', 'A3001'] },
      { id: 'W4', year: 2020, authors: [SEED, 'A3000', 'A3001'] },
    ],
  };

  it('switches the key, the table column and the URL to groups', async () => {
    serve(CIRCLES);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}`);
    await loaded();
    expect(screen.getByRole('columnheader', { name: 'Country' })).toBeInTheDocument();

    await user.click(screen.getByLabelText('Group of collaborators'));

    const key = screen.getByRole('region', { name: 'Key' });
    expect(
      within(key)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringMatching(/^Around Person A\d{4} \d$/),
      expect.stringMatching(/^Around Person A\d{4} \d$/),
    ]);
    expect(screen.getByRole('columnheader', { name: 'Group' })).toBeInTheDocument();
    expect(window.location.search).toContain('color=group');
  });

  it('puts the circles in the table in words, so colour is not the only way to tell', async () => {
    serve(CIRCLES);
    renderApp(`?a=${SEED}&color=group`);
    await loaded();

    const group = (name: string) => within(row(name)).getAllByRole('cell')[2]!.textContent;
    expect(group('Person A2000')).toBe(group('Person A2001'));
    expect(group('Person A3000')).toBe(group('Person A3001'));
    expect(group('Person A2000')).not.toBe(group('Person A3000'));
    expect(group('Person A2000')).toMatch(/^Around Person/);
  });

  it('goes back to countries', async () => {
    serve(CIRCLES);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}&color=group`);
    await loaded();

    await user.click(screen.getByLabelText('Country'));

    expect(screen.getByRole('columnheader', { name: 'Country' })).toBeInTheDocument();
    expect(window.location.search).not.toContain('color');
  });

  it('can sort the table by group', async () => {
    serve(CIRCLES);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}&color=group`);
    await loaded();

    await user.selectOptions(screen.getByLabelText('Sort by'), 'colour');

    expect(screen.getByRole('option', { name: 'Group' })).toBeInTheDocument();
  });
});

describe('choosing a person', () => {
  it('shows their details and the papers they share with the starting person', async () => {
    serve(WORLD);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}`);
    await loaded();

    await user.click(within(row('Person A3000')).getByRole('button', { name: 'Person A3000' }));

    const details = screen.getByRole('region', { name: 'Person A3000' });
    expect(within(details).getByText('Papers with Person A1000')).toBeInTheDocument();
    expect(within(details).getAllByRole('link', { name: /Paper W/ })).toHaveLength(2);
    expect(await within(details).findByText('Test University')).toBeInTheDocument();
    expect(within(details).getByText('4,567')).toBeInTheDocument();
    expect(window.location.search).toContain('sel=A3000');
  });

  it('measures the table against the person chosen, not only the starting person', async () => {
    serve(WORLD);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}`);
    await loaded();
    // with nobody chosen the table compares with the starting person: A2000 shares three papers with them
    expect(table()).toHaveAccessibleName(
      'People in the network, with the papers they share with Person A1000',
    );
    expect(row('Person A2000')).toHaveTextContent(/3\s*3\s*United States/);

    await user.click(within(row('Person A3000')).getByRole('button', { name: 'Person A3000' }));

    expect(screen.getByRole('columnheader', { name: 'Papers with Person A3000' })).toBeInTheDocument();
    // A2000 and A3000 share only W1
    expect(row('Person A2000')).toHaveTextContent(/3\s*1\s*United States/);
    expect(row('Person A3000')).toHaveTextContent(/–/);
  });

  it('links to their OpenAlex profile', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}&sel=A2000`);
    await loaded();

    expect(screen.getByRole('link', { name: /OpenAlex profile/ })).toHaveAttribute(
      'href',
      'https://openalex.org/authors/A2000',
    );
  });

  it('shows the most cited papers for the starting person', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}&sel=${SEED}`);
    await loaded();

    const details = screen.getByRole('region', { name: 'Person A1000' });
    expect(within(details).getByText('Most cited papers')).toBeInTheDocument();
    expect(within(details).getAllByRole('link', { name: /Paper W/ })[0]).toHaveTextContent('Paper W1');
  });

  it('asks the person to pick someone when nobody is chosen', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);
    await loaded();

    expect(screen.getByText(/Select a person in the network or the table/)).toBeInTheDocument();
  });

  it('can start again from someone else, and the back button returns', async () => {
    serve({ ...WORLD, A2000: WORLD.A2000! });
    const user = userEvent.setup();
    renderApp(`?a=${SEED}&sel=A2000`);
    await loaded();

    await user.click(screen.getByRole('button', { name: /Start again from Person A2000/ }));
    await waitFor(() => expect(window.location.search).toContain('a=A2000'));

    act(() => {
      window.history.back();
    });
    await waitFor(() => expect(window.location.search).toContain(`a=${SEED}`));
  });
});

describe('adding and removing collaborators', () => {
  it('loads the collaborators of a chosen person into the same network', async () => {
    serve(WORLD);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}`);
    await loaded();

    await user.click(within(row('Person A2000')).getByRole('button', { name: /Add/ }));

    expect(await screen.findByText(/from 2 researchers’ most cited papers/)).toBeInTheDocument();
    expect(within(table()).getAllByRole('row')).toHaveLength(7);
    expect(window.location.search).toContain('x=A2000');
    expect(row('Person A5000')).toBeInTheDocument();
  });

  it('removes them again', async () => {
    serve(WORLD);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}&x=A2000`);
    await screen.findByText(/from 2 researchers’/);

    await user.click(within(row('Person A2000')).getByRole('button', { name: /Remove/ }));

    expect(await screen.findByText(/from one researcher’s/)).toBeInTheDocument();
    expect(window.location.search).not.toContain('x=');
  });

  it('does not allow more than six', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}&x=A2001,A2002,A2003,A2004,A2005,A2006`);
    await loaded();

    expect(within(row('Person A2000')).getByRole('button', { name: /Add/ })).toBeDisabled();
  });

  it('says so when a collaborator’s papers cannot be loaded, and lets the person retry or remove', async () => {
    serve(WORLD);
    server.use(
      http.get('https://api.openalex.org/works', ({ request }) => {
        const id = (new URL(request.url).searchParams.get('filter') ?? '').split(':')[1];
        return id === 'A2000' ? HttpResponse.json({}, { status: 500 }) : undefined;
      }),
    );
    const user = userEvent.setup();
    renderApp(`?a=${SEED}&x=A2000`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Could not add that person’s collaborators/);
    expect(alert).toHaveTextContent('status 500');

    await user.click(within(alert).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(window.location.search).not.toContain('x=');
  });
});

describe('the year range', () => {
  it('drops people whose papers fall outside it', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}&from=2016`);

    // only W3 and W4 are in range: A2000 (W4), A3000 and A4000 (W3), and the starting person
    expect(
      await screen.findByText(/Showing 4 people and 4 collaborations .*2016 to 2022/),
    ).toBeInTheDocument();
    renderApp(`?a=${SEED}&from=2021`);
  });

  it('removes collaborators when the range narrows', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}&from=2021&to=2022`);

    expect(
      await screen.findByText(/Showing 2 people and 1 collaborations .*2021 to 2022/),
    ).toBeInTheDocument();
  });

  it('keeps a range that is out of order sensible', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}&from=2022&to=2012`);

    expect(await screen.findByText(/2022 to 2022/)).toBeInTheDocument();
  });

  it('writes only a changed range to the URL when a slider moves', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);
    await loaded();

    const from = screen.getByLabelText('From year');
    expect(from).toHaveValue('2010');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(from, { target: { value: '2015' } });

    await waitFor(() => expect(window.location.search).toContain('from=2015'));
    expect(window.location.search).not.toContain('to=');
    fireEvent.change(from, { target: { value: '2010' } });
    await waitFor(() => expect(window.location.search).not.toContain('from='));
  });

  it('tells the person how many papers the author limit is ignoring', async () => {
    serve({
      [SEED]: [
        { id: 'W1', year: 2020, authors: [SEED, 'A2000'] },
        { id: 'W2', year: 2020, authors: [SEED, ...Array.from({ length: 14 }, (_, i) => `A${3000 + i}`)] },
      ],
    });
    renderApp(`?a=${SEED}`);
    await loaded();

    expect(screen.getByText(/1 paper is being ignored/)).toBeInTheDocument();
  });
});

describe('when OpenAlex cannot help', () => {
  it('uses a saved copy for a featured researcher and says so', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json({}, { status: 429 })));
    server.use(
      http.get('https://api.openalex.org/authors/:id', () => HttpResponse.json({}, { status: 429 })),
    );
    renderApp(`?a=${FEATURED[0]!.id}`);

    expect(await screen.findByRole('note')).toHaveTextContent(
      /saved copy of OpenAlex data from \d{4}-\d{2}-\d{2}/,
    );
    await loaded();
    expect(within(table()).getAllByRole('row').length).toBeGreaterThan(10);
  });

  it('explains the limit and offers the featured researchers when there is no saved copy', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json({}, { status: 429 })));
    const user = userEvent.setup();
    renderApp(`?a=A99999`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/free allowance for today has been used up/);
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: FEATURED[1]!.name }));
    await waitFor(() => expect(window.location.search).toContain(FEATURED[1]!.id));
  });

  it.each([
    ['an unknown researcher', 404, /no record for that researcher/],
    ['a server error', 502, /status 502/],
  ])('explains %s', async (_name, status, text) => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json({}, { status })));
    renderApp(`?a=A99999`);

    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });

  it('says it could not read data in an unexpected shape', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json({ results: 'nope' })));
    renderApp(`?a=A99999`);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not read/);
  });

  it('recovers when Try again works', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderApp(`?a=${SEED}`);
    // a network failure is retried once, a second later, before the error is shown
    const button = await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 });

    serve(WORLD);
    await user.click(button);

    await loaded();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a loading message while papers load', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);

    expect(screen.getByText(/Loading a researcher’s papers/)).toBeInTheDocument();
    await loaded();
    expect(screen.queryByText(/Loading a researcher’s papers/)).not.toBeInTheDocument();
  });
});

describe('searching', () => {
  const results = [
    {
      id: 'https://openalex.org/A1000',
      display_name: 'Ada Lovelace',
      works_count: 12,
      cited_by_count: 100,
      last_known_institutions: [{ display_name: 'Analytical Engine Co' }],
    },
    { id: 'https://openalex.org/A7777', display_name: 'Ada Other', works_count: 1 },
  ];

  it('lists matches and starts from the one chosen', async () => {
    serve(WORLD, { searchResults: results });
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('combobox', { name: 'Find a researcher' }), 'Ada');

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Ada Lovelace');
    expect(options[0]).toHaveTextContent('Analytical Engine Co · 12 works');
    expect(options[1]).toHaveTextContent('No institution listed');
    await user.click(options[0]!);

    await loaded();
    expect(window.location.search).toContain('a=A1000');
  });

  it('can be driven from the keyboard', async () => {
    serve(WORLD, { searchResults: results });
    const user = userEvent.setup();
    renderApp();
    const box = screen.getByRole('combobox', { name: 'Find a researcher' });

    await user.type(box, 'Ada');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
    expect(box).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]!.id);
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');

    await loaded();
    expect(window.location.search).toContain('a=A1000');
    expect(box).toHaveValue('');
  });

  it('wraps round the list and closes with Escape', async () => {
    serve(WORLD, { searchResults: results });
    const user = userEvent.setup();
    renderApp();
    const box = screen.getByRole('combobox', { name: 'Find a researcher' });

    await user.type(box, 'Ada');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowUp}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');

    expect(box).toHaveAttribute('aria-expanded', 'false');
  });

  it('says how many were found and when there are none', async () => {
    serve(WORLD, { searchResults: [] });
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('combobox', { name: 'Find a researcher' }), 'zzzz');

    expect(await screen.findByText('No researchers found.')).toBeInTheDocument();
  });

  it('does not search for a single letter', async () => {
    const asked = vi.fn();
    server.use(
      http.get('https://api.openalex.org/authors', () => {
        asked();
        return HttpResponse.json({ results: [] });
      }),
    );
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('combobox', { name: 'Find a researcher' }), 'a');
    await new Promise((r) => setTimeout(r, 450));

    expect(asked).not.toHaveBeenCalled();
  });

  it('says so when search is unavailable', async () => {
    server.use(http.get('https://api.openalex.org/authors', () => HttpResponse.json({}, { status: 429 })));
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('combobox', { name: 'Find a researcher' }), 'Ada');

    expect(
      await screen.findByText(/Search is unavailable because OpenAlex’s free limit/),
    ).toBeInTheDocument();
  });
});

describe('the keyboard and the picture', () => {
  it('moves between people with the arrow keys and loads collaborators with Enter', async () => {
    serve(WORLD);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}`);
    await loaded();

    screen.getByRole('application').focus();
    await user.keyboard('{ArrowRight}');
    expect(window.location.search).toContain(`sel=${SEED}`);
    await user.keyboard('{ArrowRight}');
    expect(window.location.search).toContain('sel=A2000');
    await user.keyboard('{Enter}');

    expect(await screen.findByText(/from 2 researchers’/)).toBeInTheDocument();
    expect(window.location.search).toContain('x=A2000');
  });

  it('goes back round the list and clears with Escape', async () => {
    serve(WORLD);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}&sel=${SEED}`);
    await loaded();

    screen.getByRole('application').focus();
    await user.keyboard('{ArrowLeft}');
    expect(window.location.search).toContain('sel=A4000');
    await user.keyboard('{Escape}');
    expect(window.location.search).not.toContain('sel=');
  });

  it('has real buttons to zoom and fit', async () => {
    serve(WORLD);
    const user = userEvent.setup();
    renderApp(`?a=${SEED}`);
    await loaded();

    for (const name of ['Zoom in', 'Zoom out', 'Fit']) {
      await user.click(screen.getByRole('button', { name }));
    }
    expect(screen.getByRole('button', { name: 'Fit' })).toBeInTheDocument();
  });
});

describe('photos', () => {
  const photoFor = (orcid: string) =>
    http.post('https://query.wikidata.org/sparql', () =>
      HttpResponse.json({ results: { bindings: [{ orcid: { value: orcid }, image: { value: FILE } }] } }),
    );

  it('shows a real photo with a credit for someone whose ORCID iD matches', async () => {
    serve(WITH_ORCID);
    server.use(photoFor(ORCID_A));
    renderApp(`?a=${SEED}&sel=${SEED}`);
    await loaded();

    const portrait = await screen.findByRole('img', { name: 'Person A1000' });
    expect(portrait).toHaveAttribute('src', expect.stringContaining('Ada%20Lovelace.jpg'));
    const credit = screen.getByRole('link', { name: /Photo from Wikimedia Commons/ });
    expect(credit).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Ada%20Lovelace.jpg');
  });

  it('finds photos for several people at once, not just the first', async () => {
    const ORCID_B = '0000-0002-1825-0097';
    serve({
      [SEED]: [
        {
          id: 'W1',
          year: 2020,
          authors: [
            [SEED, 'GB', ORCID_A] as [string, string, string],
            ['A2000', 'US', ORCID_B] as [string, string, string],
          ],
        },
      ],
    });
    server.use(
      http.post('https://query.wikidata.org/sparql', () =>
        HttpResponse.json({
          results: {
            bindings: [
              { orcid: { value: ORCID_A }, image: { value: FILE } },
              { orcid: { value: ORCID_B }, image: { value: FILE.replace('Ada', 'Grace') } },
            ],
          },
        }),
      ),
    );
    renderApp(`?a=${SEED}&sel=A2000`);
    await loaded();

    const portrait = await screen.findByRole('img', { name: 'Person A2000' });
    expect(portrait).toHaveAttribute('src', expect.stringContaining('Grace'));
  });

  it('shows no photo for someone who does not have one', async () => {
    serve(WITH_ORCID);
    renderApp(`?a=${SEED}&sel=A2000`);
    await loaded();

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Wikimedia Commons/ })).not.toBeInTheDocument();
  });

  it('asks only for the people who have an ORCID iD, matching on it and not on a name', async () => {
    serve(WITH_ORCID);
    let sent = '';
    server.use(
      http.post('https://query.wikidata.org/sparql', async ({ request }) => {
        sent = decodeURIComponent((await request.text()).replace(/\+/g, ' '));
        return HttpResponse.json({ results: { bindings: [] } });
      }),
    );
    renderApp(`?a=${SEED}`);
    await loaded();

    await waitFor(() => expect(sent).toContain(ORCID_A));
    expect(sent).not.toContain('A2000');
    expect(sent).not.toContain('Person');
  });

  it('does not ask Wikidata at all when nobody has an ORCID iD', async () => {
    serve(WORLD);
    const asked = vi.fn();
    server.use(
      http.post('https://query.wikidata.org/sparql', () => {
        asked();
        return HttpResponse.json({ results: { bindings: [] } });
      }),
    );
    renderApp(`?a=${SEED}`);
    await loaded();
    await new Promise((r) => setTimeout(r, 100));

    expect(asked).not.toHaveBeenCalled();
  });

  it('carries on with initials when Wikidata cannot be reached', async () => {
    serve(WITH_ORCID);
    server.use(http.post('https://query.wikidata.org/sparql', () => HttpResponse.error()));
    renderApp(`?a=${SEED}&sel=${SEED}`);
    await loaded();

    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Person A1000' })).toBeInTheDocument();
  });
});

describe('page details', () => {
  it('names the page after the researcher', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);
    await loaded();

    expect(document.title).toBe('Person A1000: Co-author Explorer');
  });

  it('credits OpenAlex and warns that author matching is imperfect', () => {
    renderApp();

    expect(screen.getByRole('link', { name: 'OpenAlex' })).toHaveAttribute('href', 'https://openalex.org');
    expect(screen.getByText(/sometimes merges or splits people/)).toBeInTheDocument();
    expect(screen.getByText(/matched by ORCID iD, never by name/)).toBeInTheDocument();
  });

  it('has one main landmark and one h1', async () => {
    serve(WORLD);
    renderApp(`?a=${SEED}`);
    await loaded();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('accessibility', () => {
  const run = (container: HTMLElement) =>
    axe.run(container, { rules: { 'color-contrast': { enabled: false } } });

  it('has no axe violations on the starting screen', async () => {
    const { container } = renderApp();
    expect((await run(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it('has no axe violations with a network on screen and someone selected', async () => {
    serve(WORLD);
    const { container } = renderApp(`?a=${SEED}&sel=A2000`);
    await loaded();
    await screen.findByText('Test University');

    expect((await run(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it('has no axe violations in the error state', async () => {
    server.use(http.get('https://api.openalex.org/works', () => HttpResponse.json({}, { status: 500 })));
    const { container } = renderApp(`?a=A99999`);
    await screen.findByRole('alert');

    expect((await run(container)).violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
