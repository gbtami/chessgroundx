import * as cg from './types.js';
import * as util from './util.js';
import { dragNewPiece } from './drag.js';
import { setDropMode, cancelDropMode } from './drop.js';

import { HeadlessState, State } from './state.js';
import { predrop } from './predrop.js';

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

      renderPiece(p, state);

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
          if (/*state.movable.free ||*/ state.movable.color === color) click(state, e);
        })
      );
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
      renderPiece(el, state);
      el = el.nextSibling as cg.PieceNode;
    }
  }
  renderPocket(state.dom.elements.pocketBottom);
  renderPocket(state.dom.elements.pocketTop);
}

function renderPiece(el: HTMLElement, state: HeadlessState) {
  const role = el.getAttribute("data-role") as cg.Role;
  const color = el.getAttribute("data-color") as cg.Color;
  el.setAttribute("data-nb", '' + (state.boardState.pockets![color].get(role) ?? 0));

  const dropMode = state.dropmode;
  const dropPiece = state.dropmode.piece;
  const selectedSquare = dropMode.active && dropPiece?.role === role && dropPiece.color === color;
  const preDropRole = state.predroppable.current?.role;
  const activeColor = color === state.movable.color;

  if (activeColor && preDropRole === role) {
    el.classList.add('premove');
  } else {
    el.classList.remove('premove');
  }
  if (selectedSquare) {
    el.classList.add('selected-square');
  } else {
    el.classList.remove('selected-square');
  }
}

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
    setDropMode(state as State, {color, role});
  } else {
    cancelDropMode(state);
  }
  e.stopPropagation();
  e.preventDefault();
}

export function drag(state: HeadlessState, e: cg.MouchEvent): void {
  if (e.button !== undefined && e.button !== 0) return; // only touch or left click
  const el = e.target as HTMLElement,
    role = el.getAttribute('data-role') as cg.Role,
    color = el.getAttribute('data-color') as cg.Color,
    n = Number(el.getAttribute('data-nb'));
  el.setAttribute("canceledDropMode", ""); // We want to know if later in this method cancelDropMode was called,
                                           // so right after mouse button is up and dragging is over if a click event is triggered
                                           // (which annoyingly does happen if mouse is still over same pocket element)
                                           // then we know not to call setDropMode selecting the piece we have just unselected.
                                           // Alternatively we might not cancelDropMode on drag of same piece but then after drag is over
                                           // the selected piece remains selected which is not how board pieces behave and more importantly is counter intuitive
  if (n === 0) return;

  // always cancel drop mode if it is active
  if (state.dropmode.active) {
    cancelDropMode(state);

    if (state.dropmode.piece?.role === role) {
      // we mark it with this only if we are cancelling the same piece we "drag"
      el.setAttribute("canceledDropMode", "true");
    }
  }

  e.stopPropagation();
  e.preventDefault();
  dragNewPiece(state as State, {color, role}, e);
}

/**
 * todo: Ideally this whole method should disappear. It is legacy solution from when pocket was outside CG for the case
 *       when dragging started while another premove/predrop was set. After that premove/drop executes and turn is again
 *       opp's, we are again in predrop state and need to set those again
 *       Maybe predroppable should be initialized in board.ts->setSelected() and implemented similarly as premove dests
 *       Could happen together with further refactoring to make pocket more of a first class citizen and enable other
 *       stuff like highlighting last move etc. maybe.
 *       Even if not made part of the setSelected infrastructure, i am pretty sure this is not needed if we track and
 *       check better what is dragged/clicked and with proper combination of if-s in render.ts and clean-up-to-undef logic
 * */
export function setPredropDests(state: HeadlessState): void {
  const piece = state.draggable.current?.piece;
  if (piece && piece.color !== state.turnColor) {
      //it is opponents turn, but we are dragging a pocket piece at the same time
      state.premovable.dests = predrop(state.boardState.pieces, piece, state.dimensions, state.variant);
  }
}
