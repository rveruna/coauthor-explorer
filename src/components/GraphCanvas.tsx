import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { drawGraph } from '../domain/draw';
import type { Graph, GraphNode } from '../domain/graph';
import { ForceLayout } from '../domain/layout';
import { fitView, hitTest, toWorld, zoomAt, type View } from '../domain/view';

interface Props {
  graph: Graph;
  selectedId: string | null;
  /** The researcher the network started from. */
  focusId: string | null;
  /** Changes when a different researcher is chosen, so the view is fitted afresh. */
  fitKey: string;
  colorOf: (node: GraphNode) => string;
  /** Where groups are pulled to, or null. */
  anchors: Map<string, { x: number; y: number }> | null;
  reducedMotion: boolean;
  onSelect: (id: string | null) => void;
  onExpand: (id: string) => void;
  helpId: string;
}

const MOVE_THRESHOLD = 4;

/**
 * The network as a live, draggable picture on a canvas. A picture cannot be read by a screen reader, so the same
 * people are listed in the table below, and this component can also be driven entirely from the keyboard.
 */
export function GraphCanvas({
  graph,
  selectedId,
  focusId,
  fitKey,
  colorOf,
  anchors,
  reducedMotion,
  onSelect,
  onExpand,
  helpId,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<ForceLayout | null>(null);
  const viewRef = useRef<View>({ x: 0, y: 0, k: 1 });
  const sizeRef = useRef({ width: 0, height: 0 });
  const userMovedRef = useRef(false);
  const hoverRef = useRef<string | null>(null);
  const frameRef = useRef(0);
  const dragRef = useRef<{
    mode: 'node' | 'pan';
    id?: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const latest = useRef({ graph, selectedId, focusId, colorOf });
  // drawing happens outside React's render, so it reads the latest props from here
  useLayoutEffect(() => {
    latest.current = { graph, selectedId, focusId, colorOf };
  });

  const draw = useCallback(() => {
    frameRef.current = 0;
    const ctx = canvasRef.current?.getContext('2d');
    const layout = layoutRef.current;
    if (!ctx || !layout) return;
    const { width, height } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    drawGraph(ctx, {
      graph: latest.current.graph,
      nodes: layout.nodes,
      view: viewRef.current,
      width,
      height,
      colorOf: latest.current.colorOf,
      selectedId: latest.current.selectedId,
      hoverId: hoverRef.current,
      focusId: latest.current.focusId,
    });
  }, []);

  const schedule = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const fit = useCallback(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    const { width, height } = sizeRef.current;
    viewRef.current = fitView(layout.nodes, width, height);
  }, []);

  // one layout for the life of the component
  useEffect(() => {
    const layout = new ForceLayout(() => {
      if (!userMovedRef.current) fit();
      schedule();
    });
    layoutRef.current = layout;
    return () => {
      layout.stop();
      cancelAnimationFrame(frameRef.current);
      layoutRef.current = null;
    };
  }, [fit, schedule]);

  // a different starting researcher gets a fresh view
  useEffect(() => {
    userMovedRef.current = false;
  }, [fitKey]);

  // feed the layout whenever the graph changes
  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    layout.update(graph);
    layout.setAnchors(anchors);
    if (reducedMotion) {
      layout.settle();
    } else {
      layout.start(0.7);
    }
    if (!userMovedRef.current) fit();
    schedule();
  }, [graph, anchors, reducedMotion, fit, schedule]);

  useEffect(() => {
    schedule();
  }, [selectedId, focusId, colorOf, schedule]);

  // keep the canvas sharp at any size and pixel density
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      if (!userMovedRef.current) fit();
      schedule();
    };
    resize();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, [fit, schedule]);

  // the wheel listener must not be passive, or the page would scroll while zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      viewRef.current = zoomAt(viewRef.current, event.clientX - rect.left, event.clientY - rect.top, factor);
      userMovedRef.current = true;
      schedule();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [schedule]);

  const pointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const nodeAt = (sx: number, sy: number) => {
    const layout = layoutRef.current;
    if (!layout) return null;
    const w = toWorld(viewRef.current, sx, sy);
    return hitTest(layout.nodes, w.x, w.y, 3 / viewRef.current.k);
  };

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const p = pointer(event);
    const hit = nodeAt(p.x, p.y);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = hit
      ? { mode: 'node', id: hit.id, startX: p.x, startY: p.y, moved: false }
      : { mode: 'pan', startX: p.x, startY: p.y, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const p = pointer(event);
    const drag = dragRef.current;
    if (!drag) {
      const hit = nodeAt(p.x, p.y);
      if ((hit?.id ?? null) !== hoverRef.current) {
        hoverRef.current = hit?.id ?? null;
        event.currentTarget.style.cursor = hit ? 'pointer' : 'grab';
        schedule();
      }
      return;
    }
    if (!drag.moved && Math.hypot(p.x - drag.startX, p.y - drag.startY) < MOVE_THRESHOLD) return;
    drag.moved = true;
    if (drag.mode === 'node' && drag.id) {
      const w = toWorld(viewRef.current, p.x, p.y);
      layoutRef.current?.pin(drag.id, w.x, w.y);
    } else {
      const view = viewRef.current;
      viewRef.current = { ...view, x: view.x + (p.x - drag.startX), y: view.y + (p.y - drag.startY) };
      drag.startX = p.x;
      drag.startY = p.y;
      userMovedRef.current = true;
    }
    schedule();
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.mode === 'node' && drag.id) {
      layoutRef.current?.release(drag.id);
      if (drag.moved) userMovedRef.current = true;
      else onSelect(drag.id);
    } else if (!drag.moved) {
      onSelect(null);
    }
  }

  // the browser took the gesture over, for example to scroll the page, so it was not a click
  function onPointerCancel() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.mode === 'node' && drag.id) layoutRef.current?.release(drag.id);
  }

  function onPointerLeave() {
    if (hoverRef.current !== null) {
      hoverRef.current = null;
      schedule();
    }
  }

  function onDoubleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const hit = nodeAt(event.clientX - rect.left, event.clientY - rect.top);
    if (hit) onExpand(hit.id);
  }

  function zoomBy(factor: number) {
    const { width, height } = sizeRef.current;
    viewRef.current = zoomAt(viewRef.current, width / 2, height / 2, factor);
    userMovedRef.current = true;
    schedule();
  }

  function resetView() {
    userMovedRef.current = false;
    fit();
    schedule();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const ids = graph.nodes.map((n) => n.id);
    const index = selectedId ? ids.indexOf(selectedId) : -1;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        if (ids.length > 0) onSelect(ids[(index + 1) % ids.length]!);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        if (ids.length > 0) onSelect(ids[index <= 0 ? ids.length - 1 : index - 1]!);
        break;
      case 'Enter':
        if (selectedId) {
          event.preventDefault();
          onExpand(selectedId);
        }
        break;
      case 'Escape':
        onSelect(null);
        break;
      case '+':
      case '=':
        zoomBy(1.25);
        break;
      case '-':
      case '_':
        zoomBy(0.8);
        break;
      case '0':
        resetView();
        break;
    }
  }

  return (
    <div className="canvas-wrap">
      {/* The graph is a custom widget, which is what role="application" is for. It is driven from the keyboard, and the
          table below lists the same people for anyone who cannot use a picture. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="graph-focus"
        tabIndex={0}
        role="application"
        aria-roledescription="network graph"
        aria-label={`Co-author network of ${graph.nodes.length} people`}
        aria-describedby={helpId}
        onKeyDown={onKeyDown}
      >
        <canvas
          ref={canvasRef}
          className="graph"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerLeave}
          onDoubleClick={onDoubleClick}
        />
      </div>
      <div className="zoom-buttons">
        <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={resetView}>
          Fit
        </button>
      </div>
    </div>
  );
}
