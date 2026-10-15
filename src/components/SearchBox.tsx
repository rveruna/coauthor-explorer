import { useId, useState, type KeyboardEvent } from 'react';
import { OpenAlexError } from '../api/openalexClient';
import { useAuthorSearch } from '../hooks/useNetwork';
import type { AuthorSummary } from '../domain/types';

interface Props {
  onPick: (author: AuthorSummary) => void;
}

function describeFailure(error: unknown): string {
  if (error instanceof OpenAlexError && error.kind === 'rate-limited') {
    return 'Search is unavailable because OpenAlex’s free limit has been reached for now. The featured researchers still work.';
  }
  return 'Search could not reach OpenAlex. The featured researchers still work.';
}

/** A search box with a list of matching researchers, following the ARIA combobox pattern. */
export function SearchBox({ onPick }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const search = useAuthorSearch(text);
  const results = search.data ?? [];
  const typed = text.trim().length >= 2;
  const showList = open && typed && results.length > 0;

  function pick(author: AuthorSummary) {
    setText('');
    setOpen(false);
    setActive(-1);
    onPick(author);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === 'Enter' && showList && active >= 0) {
      event.preventDefault();
      pick(results[active]!);
    } else if (event.key === 'Escape') {
      if (open) event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  let status = '';
  if (typed && search.isFetching) status = 'Searching…';
  else if (typed && search.isError) status = describeFailure(search.error);
  else if (typed && search.data)
    status =
      results.length === 0
        ? 'No researchers found.'
        : `${results.length} researchers found. Use the arrow keys to choose one.`;

  return (
    <div className="search">
      <label htmlFor={`${listId}-input`}>Find a researcher</label>
      <input
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Try a name, such as Jennifer Doudna"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <ul id={listId} role="listbox" aria-label="Matching researchers" hidden={!showList}>
        {results.map((author, i) => (
          // options are chosen with the keyboard through the input (arrow keys and Enter), as the combobox pattern says
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li
            key={author.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? 'active' : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(author)}
          >
            <span className="name">{author.name}</span>
            <span className="meta">
              {author.institution ?? 'No institution listed'} · {author.worksCount.toLocaleString('en-GB')}{' '}
              works
            </span>
          </li>
        ))}
      </ul>
      <p className="search-status" role="status">
        {status}
      </p>
    </div>
  );
}
