import * as cg from './types.js';
import * as util from './util.js';
import * as board from './board.js';
import { clear as drawClear } from './draw.js';
import { HeadlessState, State } from './state.js';

export function renderPocketsInitial(state: HeadlessState, elements: cg.Elements, pocketTop?: HTMLElement, pocketBottom?: HTMLElement): void {

  function pocketView(pocketEl: HTMLElement, position: cg.PocketPosition) {
    if (!state.boardState.pockets) return;
    const color = position === 'top' ? util.opposite(state.orientation) : state.orientation;

    const roles = state.pocketRoles![color];
    const pl = String(roles.length);
    const files = String(state.dimensions.width);
    const ranks = String(state.dimensions.height);
    // const pocketEl = createEl('div','pocket ' + position + ' usable');
    pocketEl.setAttribute('style', `--pocketLength: ${pl}; --files: ${files}; --ranks: ${ranks}`);
    pocketEl.classList.add('pocket', position, 'usable');

    roles.forEach(role => {
      const pieceName = util.pieceClasses({role: role, color: color} as cg.Piece, state.orientation);
      const p = util.createEl('piece', pieceName);
      // todo: next 2 attributes already exist as classes, but need inverse function for util.ts->pieceClasses()
      p.setAttribute('data-color', color);
      p.setAttribute('data-role', role);

      renderPiece(state, p);

      /*
      // TODO: i wonder if events.ts->bindBoard() or something similar is a better place similarly to main board?
      // todo: in spectators mode movable.color is never set (except in goPly to undefined). Simultaneously
      //       state.ts->default is "both" and here as well. Effect is that dragging and clicking is disabled, which is
      //       great, but feels more like an accidental side effect than intention (effectively 'both' means 'none').
      //       Maybe state.movable.color should be set to undef in roundCtrl ALWAYS when in spectotor mode instead of
      //       left unset (and with its default). Then below we can handle 'both' properly for sake of clarity
      cg.eventsDragging.forEach(name =>
        p.addEventListener(name, (e: cg.MouchEvent) => {
          if (state.movable.free || state.movable.color === color) drag(state, e);
        })
      );
      cg.eventsClicking.forEach(name =>
        p.addEventListener(name, (e: cg.MouchEvent) => {
          // movable.free is synonymous with editor mode, and right now click-drop not supported for pocket pieces
          if (state.movable.free || state.movable.color === color) click(state, e);
        })
      );
      */
      pocketEl.appendChild(p);
    });
  }
  if (pocketTop) {
    pocketTop.innerHTML='';
    elements.pocketTop = pocketTop;
    pocketView(elements.pocketTop, "top");
  }
  if (pocketBottom) {
    pocketBottom.innerHTML='';
    elements.pocketBottom = pocketBottom;
    pocketView(elements.pocketBottom, "bottom");
  }
}

/**
 * updates each piece element attributes based on state
 * */
export function renderPockets(state: State): void {
  function renderPocket(pocketEl?: HTMLElement){
    let el: cg.PieceNode | undefined = pocketEl?.firstChild as (cg.PieceNode | undefined);
    while (el) {
      renderPiece(state, el);
      el = el.nextSibling as cg.PieceNode;
    }
  }
  renderPocket(state.dom.elements.pocketBottom);
  renderPocket(state.dom.elements.pocketTop);
}

function renderPiece(state: HeadlessState, el: HTMLElement) {
  const role = el.getAttribute("data-role") as cg.Role;
  const color = el.getAttribute("data-color") as cg.Color;
  el.setAttribute("data-nb", '' + (state.boardState.pockets![color].get(role) ?? 0));

  const selected = state.selectable.selected;
  if (selected && util.isPiece(selected) && state.selectable.fromPocket && selected.role === role && selected.color === color) {
    el.classList.add('selected-square');
  } else {
    el.classList.remove('selected-square');
  }

  const premoveOrig = state.premovable.current?.[0];
  if (premoveOrig && util.isPiece(premoveOrig) && premoveOrig.role === role && premoveOrig.color === color) {
    el.classList.add('premove');
  } else {
    el.classList.remove('premove');
  }
}

/*
export function click(state: HeadlessState, e: cg.MouchEvent): void {
  if (e.button !== undefined && e.button !== 0) return; // only touch or left click

  const el = e.target as HTMLElement,
    role = el.getAttribute('data-role') as cg.Role,
    color = el.getAttribute('data-color') as cg.Color,
    number = el.getAttribute('data-nb');
  if (number === '0') return;
  const dropMode = state.dropmode;
  const dropPiece = state.dropmode.piece;

  const canceledDropMode = el.getAttribute("canceledDropMode");
  el.setAttribute("canceledDropMode", "");

  if ((!dropMode.active || dropPiece?.role !== role) && canceledDropMode !== "true") {
    setDropMode(state as State, true, {color, role});
  } else {
    cancelDropMode(state);
  }
  e.stopPropagation();
  e.preventDefault();
}
*/

export function drag(s: State, e: cg.MouchEvent): void {
  if (!e.isTrusted || (e.button !== undefined && e.button !== 0)) return; // only touch or left click
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  const el = e.target as HTMLElement,
    role = el.getAttribute('data-role') as cg.Role,
    color = el.getAttribute('data-color') as cg.Color,
    n = Number(el.getAttribute('data-nb'));
  const position = util.eventPosition(e)!;
  if (n === 0) return;
  const piece = { role, color };
  const previouslySelected = s.selectable.selected;
  if (!previouslySelected && s.drawable.enabled && (s.drawable.eraseOnClick || !piece || piece.color !== s.turnColor))
    drawClear(s);
  // Prevent touch scroll and create no corresponding mouse event, if there
  // is an intent to interact with the board.
  if (
    e.cancelable !== false &&
    (!e.touches || s.blockTouchScroll || piece || previouslySelected)
  )
    e.preventDefault();
  const hadPremove = !!s.premovable.current;
  s.stats.ctrlKey = e.ctrlKey;
  board.select(s, piece);
  const stillSelected = s.selectable.selected === piece;
  const element = pieceElementInPocket(s, piece);
  if (element && stillSelected && board.isDraggable(s, piece)) {
    s.draggable.current = {
      piece,
      origPos: position,
      pos: position,
      started: true,
      element,
      originTarget: e.target,
      fromPocket: true,
      keyHasChanged: false,
    };
    element.cgDragging = true;
    element.classList.add('dragging');
  } else {
    if (hadPremove) board.unsetPremove(s);
  }
  s.dom.redraw();
}

function pieceElementInPocket(s: State, piece: cg.Piece): cg.PieceNode | undefined {
  let el = s.dom.elements.pocketTop?.firstChild;
  while (el) {
    if ((el as HTMLElement).getAttribute('data-role') === piece.role && (el as HTMLElement).getAttribute('data-color') === piece.color && (el as cg.KeyedNode).tagName === 'PIECE') return el as cg.PieceNode;
    el = el.nextSibling;
  }
  el = s.dom.elements.pocketBottom?.firstChild;
  while (el) {
    if ((el as HTMLElement).getAttribute('data-role') === piece.role && (el as HTMLElement).getAttribute('data-color') === piece.color && (el as cg.KeyedNode).tagName === 'PIECE') return el as cg.PieceNode;
    el = el.nextSibling;
  }
  return;
}
