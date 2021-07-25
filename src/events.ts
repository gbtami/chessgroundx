import { State } from './state'
import * as drag from './drag'
import * as draw from './draw'
import { drop } from './drop'
import { eventPosition, isRightButton } from './util'
import * as cg from './types'
import { getKeyAtDomPos, whitePov } from './board';

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

//TODO:slightly misleading name - because it also handles click-moving/dropping of pieces. generally it seems to handle all click events on the board. Write some doc or even rename maybe (i guess departing too much from chessground then - see what is the state there?)
function startDragOrDraw(s: State): MouchBind {
  return e => {
    if (s.draggable.current) drag.cancel(s);
    else if (s.drawable.current) draw.cancel(s);
    else if (e.shiftKey || isRightButton(e)) { if (s.drawable.enabled) draw.start(s, e); }
    else if (!s.viewOnly) {
      if (s.dropmode.active && !squareOccupied(s, e)) drop(s, e);
      else {
        //cancelDropMode(s);//TODO:this is the logically correct place (as in lishogi) imho, but pocket.ts is not accessible now to be able to call updatePockets right after cancelDropMode. When pokcet.ts is moved to chessgroundx remove those lines from roundCtrl and do that here
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

//TODO:private? or move to util?
function squareOccupied(s: State, e: cg.MouchEvent): boolean {
  const position = eventPosition(e);
  const dest = position && getKeyAtDomPos(position, whitePov(s), s.dom.bounds(), s.geometry);
  if (dest && s.pieces[dest]) return true;
  return false;
}
