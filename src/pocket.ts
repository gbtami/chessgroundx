import * as cg from './types.js';
import * as util from './util.js';
import * as board from './board.js';
import { clear as drawClear } from './draw.js';
import { processDrag } from './drag.js';
import { HeadlessState, State } from './state.js';

export function renderPocketsInitial(state: HeadlessState, elements: cg.Elements, pocketTop?: HTMLElement, pocketBottom?: HTMLElement): void {
  if (pocketTop) {
    pocketTop.innerHTML='';
    elements.pocketTop = pocketTop;
    pocketView(state, elements.pocketTop, "top");
  }
  if (pocketBottom) {
    pocketBottom.innerHTML='';
    elements.pocketBottom = pocketBottom;
    pocketView(state, elements.pocketBottom, "bottom");
  }
}

function pocketView(state: HeadlessState, pocketEl: HTMLElement, position: cg.PocketPosition) {
  if (!state.boardState.pockets) return;
  const color = position === 'top' ? util.opposite(state.orientation) : state.orientation;
  const roles = state.pocketRoles![color];
  const pl = String(roles.length);
  const files = String(state.dimensions.width);
  const ranks = String(state.dimensions.height);
  pocketEl.setAttribute('style', `--pocketLength: ${pl}; --files: ${files}; --ranks: ${ranks}`);
  pocketEl.classList.add('pocket', position, 'usable');
  roles.forEach(role => {
    const pieceName = util.pieceClasses({role: role, color: color}, state.orientation);
    const p = util.createEl('piece', pieceName);
    p.setAttribute('data-color', color);
    p.setAttribute('data-role', role);
    renderPiece(state, p);
    pocketEl.appendChild(p);
  });
}

/**
 * updates each piece element attributes based on state
 * */
export function renderPockets(state: State): void {
  renderPocket(state, state.dom.elements.pocketBottom);
  renderPocket(state, state.dom.elements.pocketTop);
}

function renderPocket(state: HeadlessState, pocketEl?: HTMLElement) {
  let el: cg.PieceNode | undefined = pocketEl?.firstChild as (cg.PieceNode | undefined);
  while (el) {
    renderPiece(state, el);
    el = el.nextSibling as cg.PieceNode;
  }
}

function renderPiece(state: HeadlessState, el: HTMLElement) {
  const role = el.getAttribute("data-role") as cg.Role;
  const color = el.getAttribute("data-color") as cg.Color;
  el.setAttribute("data-nb", '' + (state.boardState.pockets![color].get(role) ?? 0));
  const piece = { role, color };

  const selected = state.selectable.selected;
  if (selected && util.isPiece(selected) && state.selectable.fromPocket && util.samePiece(selected, piece)) {
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

  const dragCurrent = state.draggable.current;
  if (!dragCurrent?.fromPocket || !util.samePiece(dragCurrent.piece, piece))
    el.classList.remove('dragging');
}

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
  const selected = s.selectable.selected;
  const stillSelected = selected && util.isPiece(selected) && selected.role === piece.role && selected.color === piece.color;
  const element = pieceElementInPocket(s, piece);
  if (element && stillSelected && board.isDraggable(s, piece, true)) {
    s.draggable.current = {
      piece,
      origPos: position,
      pos: position,
      started: true,
      element,
      previouslySelected,
      originTarget: e.target,
      fromPocket: true,
      keyHasChanged: false,
    };
    element.cgDragging = true;
    element.classList.add('dragging');
    processDrag(s);
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
