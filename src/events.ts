import { State } from './state'
import * as drag from './drag'
import * as draw from './draw'
import { cancelDropMode, drop } from './drop'
import { eventPosition, isRightButton } from './util'
import * as cg from './types'
import { getKeyAtDomPos, whitePov } from './board';
import { Piece } from "./types";

type MouchBind = (e: cg.MouchEvent) => void;
type StateMouchBind = (d: State, e: cg.MouchEvent) => void;

export function bindBoard(s: State): void {

  if (s.viewOnly) return;

  const boardEl = s.dom.elements.board,
  onStart = startDragOrDraw(s);

  // Cannot be passive, because we prevent touch scrolling and dragging of
  // selected elements.
  boardEl.addEventListener('touchstart', onStart as EventListener, { passive: false });
  boardEl.addEventListener('mousedown', onStart as EventListener, { passive: false });

  if (s.disableContextMenu || s.drawable.enabled) {
    boardEl.addEventListener('contextmenu', e => e.preventDefault());
  }
}

// returns the unbind function
export function bindDocument(s: State, redrawAll: cg.Redraw): cg.Unbind {

  const unbinds: cg.Unbind[] = [];

  if (!s.dom.relative && s.resizable) {
    const onResize = () => {
      s.dom.bounds.clear();
      requestAnimationFrame(redrawAll);
    };
    unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
  }

  if (!s.viewOnly) {

    const onmove: MouchBind = dragOrDraw(s, drag.move, draw.move);
    const onend: MouchBind = dragOrDraw(s, drag.end, draw.end);

    ['touchmove', 'mousemove'].forEach(ev => unbinds.push(unbindable(document, ev, onmove)));
    ['touchend', 'mouseup'].forEach(ev => unbinds.push(unbindable(document, ev, onend)));

    const onScroll = () => s.dom.bounds.clear();
    unbinds.push(unbindable(window, 'scroll', onScroll, { passive: true }));
    unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
  }

  return () => unbinds.forEach(f => f());
}

function unbindable(el: EventTarget, eventName: string, callback: MouchBind, options?: any): cg.Unbind {
  el.addEventListener(eventName, callback as EventListener, options);
  return () => el.removeEventListener(eventName, callback as EventListener);
}

// slightly misleading name - because it also handles click-moving/dropping of pieces. generally it seems to handle all click events on the board.
function startDragOrDraw(s: State): MouchBind {
  return e => {
    if (s.draggable.current) drag.cancel(s);
    else if (s.drawable.current) draw.cancel(s);
    else if (e.shiftKey || isRightButton(e)) { if (s.drawable.enabled) draw.start(s, e); }
    else if (!s.viewOnly) {
      if (s.dropmode.active && undefined == squareOccupied(s, e) ) {
        // this case covers normal drop when it is our turn or pre-drop on empty scare
        drop(s, e);
      } else if (s.dropmode.active && s.movable.color != s.turnColor /*not our turn*/ &&  squareOccupied(s, e)?.color==s.turnColor/*occupied by opp's piece*/) {
        // this case is for predrop on opp's piece
        drop(s, e);
      } else {
        // if it is occupied by our piece - cancel drop mode and start dragging that piece instead.
        // if it is occupied by opp's piece - just cancel drop mode. drag.start() will do nothing
        cancelDropMode(s);
        drag.start(s, e);
      }
    }
  };
}

function dragOrDraw(s: State, withDrag: StateMouchBind, withDraw: StateMouchBind): MouchBind {
  return e => {
    if (e.shiftKey || isRightButton(e)) { if (s.drawable.enabled) withDraw(s, e); }
    else if (!s.viewOnly) withDrag(s, e);
  };
}

function squareOccupied(s: State, e: cg.MouchEvent): Piece | undefined {
  const position = eventPosition(e);
  const dest = position && getKeyAtDomPos(position, whitePov(s), s.dom.bounds(), s.geometry);
  if (dest && s.pieces[dest]) return s.pieces[dest];
  return undefined;
}
