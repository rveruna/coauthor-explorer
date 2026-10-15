import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { buildGraph } from '../domain/graph';
import { paper } from '../test/works';
import { GraphCanvas } from './GraphCanvas';

const OPTIONS = { years: [1900, 2100] as [number, number], maxAuthorsPerPaper: 12, maxNodes: 100 };
const single = buildGraph([paper('w1', 2020, ['a'])], new Set(['a']), OPTIONS);
const pair = buildGraph([paper('w1', 2020, ['a', 'b'])], new Set(['a']), OPTIONS);

const RECT = {
  left: 0,
  top: 0,
  width: 800,
  height: 500,
  right: 800,
  bottom: 500,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

function setup(overrides: Partial<React.ComponentProps<typeof GraphCanvas>> = {}) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
  const props = {
    graph: single,
    selectedId: null,
    focusId: 'a',
    fitKey: 'a',
    colorOf: () => '#56b4e9',
    anchors: null,
    faces: new Map<string, string>(),
    reducedMotion: true,
    onSelect: vi.fn(),
    onExpand: vi.fn(),
    helpId: 'help',
    ...overrides,
  };
  const view = render(<GraphCanvas {...props} />);
  const canvas = view.container.querySelector('canvas')!;
  return { ...view, props, canvas };
}

const pointer = (type: string, target: Element, x: number, y: number, buttons = 0) => {
  const event = createEvent(type, target, {
    clientX: x,
    clientY: y,
    buttons,
    pointerId: 1,
    bubbles: true,
  } as PointerEventInit);
  // jsdom may not know about pointer events, so put the coordinates on the event itself
  Object.assign(event, { clientX: x, clientY: y, pointerId: 1 });
  fireEvent(target, event);
};

afterEach(() => vi.restoreAllMocks());

describe('GraphCanvas pointer use', () => {
  it('selects a person who is clicked', () => {
    const { canvas, props } = setup();

    pointer('pointerdown', canvas, 400, 250);
    pointer('pointerup', canvas, 400, 250);

    expect(props.onSelect).toHaveBeenCalledWith('a');
  });

  it('clears the selection when empty space is clicked', () => {
    const { canvas, props } = setup({ selectedId: 'a' });

    pointer('pointerdown', canvas, 30, 30);
    pointer('pointerup', canvas, 30, 30);

    expect(props.onSelect).toHaveBeenCalledWith(null);
  });

  it('does not select when a person is dragged', () => {
    const { canvas, props } = setup();

    pointer('pointerdown', canvas, 400, 250);
    pointer('pointermove', canvas, 440, 280);
    pointer('pointerup', canvas, 440, 280);

    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('does not treat a gesture the browser took over as a click', () => {
    const { canvas, props } = setup();

    pointer('pointerdown', canvas, 400, 250);
    pointer('pointercancel', canvas, 400, 250);
    pointer('pointerup', canvas, 400, 250);

    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('treats a tiny wobble during a click as a click', () => {
    const { canvas, props } = setup();

    pointer('pointerdown', canvas, 400, 250);
    pointer('pointermove', canvas, 402, 251);
    pointer('pointerup', canvas, 402, 251);

    expect(props.onSelect).toHaveBeenCalledWith('a');
  });

  it('does not select when the background is dragged to pan', () => {
    const { canvas, props } = setup();

    pointer('pointerdown', canvas, 30, 30);
    pointer('pointermove', canvas, 130, 90);
    pointer('pointerup', canvas, 130, 90);

    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('loads a person’s collaborators when they are double-clicked', () => {
    const { canvas, props } = setup();

    fireEvent.doubleClick(canvas, { clientX: 400, clientY: 250 });

    expect(props.onExpand).toHaveBeenCalledWith('a');
  });

  it('does nothing when empty space is double-clicked', () => {
    const { canvas, props } = setup();

    fireEvent.doubleClick(canvas, { clientX: 20, clientY: 20 });

    expect(props.onExpand).not.toHaveBeenCalled();
  });

  it('shows a pointer cursor over a person and a grab cursor over empty space', () => {
    const { canvas } = setup();

    pointer('pointermove', canvas, 400, 250);
    expect(canvas.style.cursor).toBe('pointer');
    pointer('pointermove', canvas, 20, 20);
    expect(canvas.style.cursor).toBe('grab');
  });

  it('keeps working when the pointer leaves', () => {
    const { canvas } = setup();

    pointer('pointermove', canvas, 400, 250);
    pointer('pointerleave', canvas, 0, 0);
    expect(() => pointer('pointermove', canvas, 400, 250)).not.toThrow();
  });

  it('zooms with the wheel without scrolling the page', () => {
    const { canvas } = setup();
    const event = new WheelEvent('wheel', {
      deltaY: -120,
      clientX: 400,
      clientY: 250,
      cancelable: true,
      bubbles: true,
    });

    canvas.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});

describe('GraphCanvas keyboard use', () => {
  const widget = () => screen.getByRole('application');

  it('moves through the people and wraps round', () => {
    const { props, rerender } = setup({ graph: pair });

    fireEvent.keyDown(widget(), { key: 'ArrowRight' });
    expect(props.onSelect).toHaveBeenLastCalledWith('a');

    rerender(<GraphCanvas {...props} graph={pair} selectedId="b" />);
    fireEvent.keyDown(widget(), { key: 'ArrowDown' });
    expect(props.onSelect).toHaveBeenLastCalledWith('a');

    rerender(<GraphCanvas {...props} graph={pair} selectedId="a" />);
    fireEvent.keyDown(widget(), { key: 'ArrowLeft' });
    expect(props.onSelect).toHaveBeenLastCalledWith('b');
    fireEvent.keyDown(widget(), { key: 'ArrowUp' });
    expect(props.onSelect).toHaveBeenLastCalledWith('b');
  });

  it('loads the selected person’s collaborators with Enter, and does nothing when nobody is selected', () => {
    const { props, rerender } = setup({ graph: pair });

    fireEvent.keyDown(widget(), { key: 'Enter' });
    expect(props.onExpand).not.toHaveBeenCalled();

    rerender(<GraphCanvas {...props} graph={pair} selectedId="b" />);
    fireEvent.keyDown(widget(), { key: 'Enter' });
    expect(props.onExpand).toHaveBeenCalledWith('b');
  });

  it('clears the selection with Escape', () => {
    const { props } = setup({ selectedId: 'a' });

    fireEvent.keyDown(widget(), { key: 'Escape' });

    expect(props.onSelect).toHaveBeenCalledWith(null);
  });

  it('zooms and fits from the keyboard without selecting anyone', () => {
    const { props } = setup();

    for (const key of ['+', '=', '-', '_', '0', 'x']) fireEvent.keyDown(widget(), { key });

    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('does not select anyone in an empty graph', () => {
    const { props } = setup({ graph: buildGraph([], new Set(), OPTIONS) });

    fireEvent.keyDown(widget(), { key: 'ArrowRight' });
    fireEvent.keyDown(widget(), { key: 'ArrowLeft' });

    expect(props.onSelect).not.toHaveBeenCalled();
  });
});

describe('GraphCanvas faces', () => {
  /** A canvas that records the photos drawn on it. */
  function recordingCanvas() {
    const drawn: unknown[] = [];
    const ctx = new Proxy(
      { measureText: () => ({ width: 10 }), drawImage: (img: unknown) => drawn.push(img) } as Record<
        string,
        unknown
      >,
      {
        get: (t, k: string) => t[k] ?? (() => undefined),
        set: (t, k: string, v) => ((t[k] = v), true),
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    return drawn;
  }

  /** Stands in for the browser loading pictures, so a test can decide when each one arrives. */
  function fakeImages() {
    const made: {
      src: string;
      complete: boolean;
      naturalWidth: number;
      naturalHeight: number;
      onload?: () => void;
      referrerPolicy: string;
    }[] = [];
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        complete = false;
        naturalWidth = 0;
        naturalHeight = 0;
        referrerPolicy = '';
        onload?: () => void;
        constructor() {
          made.push(this);
        }
      },
    );
    return made;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('fetches each photo once and without sending the page address', () => {
    const made = fakeImages();
    setup({ faces: new Map([['a', 'https://x.example/a.jpg']]) });

    expect(made).toHaveLength(1);
    expect(made[0]!.src).toBe('https://x.example/a.jpg');
    expect(made[0]!.referrerPolicy).toBe('no-referrer');
  });

  it('does not fetch the same photo twice', () => {
    const made = fakeImages();
    const photos = new Map([['a', 'https://x.example/a.jpg']]);
    const { props, rerender } = setup({ faces: photos });

    rerender(<GraphCanvas {...props} faces={new Map(photos)} />);

    expect(made).toHaveLength(1);
  });

  it('draws a photo only once it has arrived', async () => {
    const drawn = recordingCanvas();
    const made = fakeImages();
    setup({ faces: new Map([['a', 'https://x.example/a.jpg']]) });
    await new Promise((r) => requestAnimationFrame(r));
    expect(drawn).toHaveLength(0);

    Object.assign(made[0]!, { complete: true, naturalWidth: 100, naturalHeight: 100 });
    made[0]!.onload!();
    await new Promise((r) => requestAnimationFrame(r));

    expect(drawn).toHaveLength(1);
  });

  it('never draws a photo that failed to load', async () => {
    const drawn = recordingCanvas();
    const made = fakeImages();
    setup({ faces: new Map([['a', 'https://x.example/a.jpg']]) });

    Object.assign(made[0]!, { complete: true, naturalWidth: 0 });
    made[0]!.onload!();
    await new Promise((r) => requestAnimationFrame(r));

    expect(drawn).toHaveLength(0);
  });
});

describe('GraphCanvas set-up', () => {
  it('is named by how many people it shows and described by the help text', () => {
    setup({ graph: pair });

    const widget = screen.getByRole('application', { name: 'Co-author network of 2 people' });
    expect(widget).toHaveAttribute('aria-describedby', 'help');
    expect(widget).toHaveAttribute('aria-roledescription', 'network graph');
  });

  it('hides the canvas itself from assistive technology', () => {
    const { canvas } = setup();
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('animates when motion is not reduced, and still draws', () => {
    expect(() => setup({ reducedMotion: false })).not.toThrow();
  });

  it('fits afresh when a different researcher is chosen', () => {
    const { props, rerender } = setup();
    expect(() => rerender(<GraphCanvas {...props} fitKey="b" graph={pair} />)).not.toThrow();
  });

  it('cleans up when removed', () => {
    const { unmount } = setup({ reducedMotion: false });
    expect(() => unmount()).not.toThrow();
  });
});
