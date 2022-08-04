import { State } from './state.js';
import * as drag from './drag.js';
import * as draw from './draw.js';
import { cancelDropMode, drop } from './drop.js';
import { eventPosition, isRightButton } from './util.js';
import { getKeyAtDomPos, whitePov } from './board.js';
import * as cg from './types.js';

type MouchBind = (e: cg.MouchEvent) => void;
type StateMouchBind = (d: State, e: cg.MouchEvent) => void;

export function bindBoard(s: State, onResize: () => void): void {
  const boardEl = s.dom.elements.board;

  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(s.dom.elements.wrap);

  if (s.viewOnly) return;

  // Cannot be passive, because we prevent touch scrolling and dragging of
  // selected elements.
  const onStart = startDragOrDraw(s);
  boardEl.addEventListener('touchstart', onStart as EventListener, {
    passive: false,
  });
  boardEl.addEventListener('mousedown', onStart as EventListener, {
    passive: false,
  });

  if (s.disableContextMenu || s.drawable.enabled) {
    boardEl.addEventListener('contextmenu', e => e.preventDefault());
  }
}

// returns the unbind function
export function bindDocument(s: State, onResize: () => void): cg.Unbind {
  const unbinds: cg.Unbind[] = [];

  // Old versions of Edge and Safari do not support ResizeObserver. Send
  // chessground.resize if a user action has changed the bounds of the board.
  if (!('ResizeObserver' in window)) unbinds.push(unbindable(document.body, 'chessground.resize', onResize));

  if (!s.viewOnly) {
    const onmove = dragOrDraw(s, drag.move, draw.move);
    const onend = dragOrDraw(s, drag.end, draw.end);

    for (const ev of ['touchmove', 'mousemove']) unbinds.push(unbindable(document, ev, onmove as EventListener));
    for (const ev of ['touchend', 'mouseup']) unbinds.push(unbindable(document, ev, onend as EventListener));

    const onScroll = () => s.dom.bounds.clear();
    unbinds.push(unbindable(document, 'scroll', onScroll, { capture: true, passive: true }));
    unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
  }

  return () => unbinds.forEach(f => f());
}

function unbindable(
  el: EventTarget,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): cg.Unbind {
  el.addEventListener(eventName, callback, options);
  return () => el.removeEventListener(eventName, callback, options);
}

const startDragOrDraw =
  (s: State): MouchBind =>
  e => {
    if (s.draggable.current) drag.cancel(s);
    else if (s.drawable.current) draw.cancel(s);
    else if (e.shiftKey || isRightButton(e)) {
      if (s.drawable.enabled) draw.start(s, e);
    } else if (!s.viewOnly) {
        if (s.dropmode.active &&
            (squareOccupied(s, e) === undefined ||
                (s.movable.color !== s.turnColor && squareOccupied(s, e)?.color === s.turnColor))
        ) {
            // only apply drop if the dest square is empty or predropping on an opponent's piece
            drop(s, e);
        } else {
            cancelDropMode(s);
            drag.start(s, e);
        }
    }
  };

const dragOrDraw =
  (s: State, withDrag: StateMouchBind, withDraw: StateMouchBind): MouchBind =>
  e => {
    if (s.drawable.current) {
      if (s.drawable.enabled) withDraw(s, e);
    } else if (!s.viewOnly) withDrag(s, e);
  };

function squareOccupied(s: State, e: cg.MouchEvent): cg.Piece | undefined {
  const position = eventPosition(e);
  const dest = position && getKeyAtDomPos(position, whitePov(s), s.dom.bounds(), s.dimensions);
  if (dest && s.boardState.pieces.get(dest)) return s.boardState.pieces.get(dest);
  else return undefined;
}
