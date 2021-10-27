import * as cg from './types';
import * as util from './util';
import { dragNewPiece } from './drag';
import { setDropMode, cancelDropMode } from './drop';

import { createEl, letterOf, opposite, pieceClasses as pieceNameOf, roleOf } from "./util";
import { HeadlessState, State } from "./state";
import { Elements, PieceNode } from "./types";
import { lc } from "./commonUtils";
import { predrop } from "./predrop";

// These types maybe belong to ./types.ts, but put here to avoid merge conflicts from upsteam
type Position = 'top' | 'bottom';
export type Pocket = Partial<Record<cg.Role, number>>;
export type Pockets = Partial<Record<cg.Color, Pocket>>;
export type PocketRoles = (color: cg.Color) => string[] | undefined; // type for functions that map a color to possible
                                                                     // pieces that can be in pocket for that side

export const eventsDragging = ['mousedown', 'touchmove'];
export const eventsClicking = ['click'];

/**
 * Logically maybe belongs to fen.ts, but put here to avoid merge conflicts from upsteam
 * Analogous to fen.ts->read(), but for pocket part of FEN
 * TODO: See todo in fen.ts->read() as well. Not sure if pocket parsing belongs there unless return
 *       type is extended to contain pocket state.
 * */
export function readPockets(fen: cg.FEN, pocketRoles: PocketRoles): Pockets | undefined {
  const placement = fen.split(" ")[0];
  const bracketPos = placement.indexOf("[");
  const pocketsFenPart = bracketPos !== -1 ? placement.slice(bracketPos) : undefined;

  if (pocketsFenPart) {
    const rWhite = pocketRoles('white') ?? [];
    const rBlack = pocketRoles('black') ?? [];
    const pWhite: Pocket = {};
    const pBlack: Pocket = {};
    rWhite.forEach(r => pWhite[roleOf(r as cg.PieceLetter)] = lc(pocketsFenPart, r, true));
    rBlack.forEach(r => pBlack[roleOf(r as cg.PieceLetter)] = lc(pocketsFenPart, r, false));
    return {white: pWhite, black: pBlack};
  }
  return undefined;
}

function renderPiece(el: HTMLElement, state: HeadlessState) {
  const role = el.getAttribute("data-role") as cg.Role;
  const color = el.getAttribute("data-color") as cg.Color;
  el.setAttribute("data-nb", '' + (state.pockets![color]![role] ?? 0));

  const dropMode = state.dropmode;
  const dropPiece = state.dropmode.piece;
  const selectedSquare = dropMode?.active && dropPiece?.role === role && dropPiece?.color === color;
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

export function renderPocketsInitial(state: HeadlessState, elements: Elements, pocketTop?: HTMLElement, pocketBottom?: HTMLElement) {

  function pocketView(pocketEl: HTMLElement, position: Position) {

    if (!state.pockets) return;

    const color = position === 'top' ? opposite(state.orientation) : state.orientation;
    const pocket = state.pockets[color];
    if (!pocket) return;

    const roles = Object.keys(pocket); // contains the list of possible pieces/roles (i.e. for crazyhouse p-piece, n-piece, b-piece, r-piece, q-piece) in the order they will be displayed in the pocket

    const pl = String(roles!.length);
    const files = String(state.dimensions.width);
    const ranks = String(state.dimensions.height);
    // const pocketEl = createEl('div','pocket ' + position + ' usable');
    pocketEl.setAttribute('style', `--pocketLength: ${pl}; --files: ${files}; --ranks: ${ranks}`);
    pocketEl.classList.add('pocket', position, 'usable');

    roles.forEach((role: string) => {
      const pieceName = pieceNameOf({role: role, color: color, promoted: false} as cg.Piece, state.orientation);
      const p = createEl('piece', pieceName);
      // todo: next 2 attributes already exist as classes, but need inverse function for util.ts->pieceClasses()
      p.setAttribute('data-color', color);
      p.setAttribute('data-role', role);

      renderPiece(p, state);

      // todo: i wonder if events.ts->bindBoard() or something similar is a better place for this for some reason?
      // todo: in spectators mode movable.color is never set (except in goPly to undefined). Simultaneously
      //       state.ts->default is "both" and here as well. Effect is that dragging and clicking is disabled, which is
      //       great, but feels more like an accidental side effect than intention (effectively 'both' means 'none').
      //       Maybe state.movable.color should be set to undef in roundCtrl ALWAYS when in spectotor mode instead of
      //       left unset (and with its default). Then below we can handle 'both' properly for sake of clarity
      eventsDragging.forEach(name =>
        p.addEventListener(name, (e: cg.MouchEvent) => {
          if (state.movable.free || state.movable.color === color) drag(state, e);
        })
      );
      eventsClicking.forEach(name =>
        p.addEventListener(name, (e: cg.MouchEvent) => {
          // movable.free is synonymous with editor mode, and right now click-drop not supported for pocket pieces
          if (/*state.movable.free ||*/ state.movable.color === color) click(state, e);
        })
      );
      pocketEl.appendChild(p);
    });
  }

  //
  if (pocketTop) {
    elements.pocketTop = pocketTop;
    pocketView(elements.pocketTop, "top");
  }
  if (pocketBottom) {
    elements.pocketBottom = pocketBottom;
    pocketView(elements.pocketBottom, "bottom");
  }
}

export function click(state: HeadlessState, e: cg.MouchEvent): void {
  if (e.button !== undefined && e.button !== 0) return; // only touch or left click

  const el = e.target as HTMLElement,
    role = el.getAttribute('data-role') as cg.Role,
    color = el.getAttribute('data-color') as cg.Color,
    number = el.getAttribute('data-nb');
  if (!role || !color || number === '0') return;
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
  if (!role || !color || n === 0) return;

  // always cancel drop mode if it is active
  if (state.dropmode.active) {
    cancelDropMode(state);

    if (state.dropmode.piece?.role === role) {
      // we mark it with this only if we are cancelling the same piece we "drag"
      el.setAttribute("canceledDropMode", "true");
    }
  }

  if (state.movable.dests) {
    const dropDests = new Map([[role, state.movable.dests.get(util.letterOf(role, true) + "@" as cg.Orig)!]]);
    state.dropmode.dropDests = dropDests;
  }

  e.stopPropagation();
  e.preventDefault();
  dragNewPiece(state as State, {color, role}, e);
}

/**
 * updates each piece element attributes based on state
 * */
export function renderPockets(state: State): void {
  function renderPocket(pocketEl?: HTMLElement){
    let el: PieceNode | undefined = pocketEl?.firstChild as (PieceNode | undefined);
    while (el) {
      renderPiece(el, state);
      el = el.nextSibling as PieceNode;
    }
  }
  renderPocket(state.dom.elements.pocketBottom);
  renderPocket(state.dom.elements.pocketTop);
}

function pocket2str(pocket: Pocket) {
  const letters: string[] = [];
  for (const role in pocket) {
    letters.push(letterOf(role as cg.Role, true).repeat(pocket[role as cg.Role] || 0));
  }
  return letters.join('');
}

export function pockets2str(pockets: Pockets) {
  return '[' + pocket2str(pockets['white']!) + pocket2str(pockets['black']!).toLowerCase() + ']';
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
      const dropDests = predrop(state.pieces, piece, state.geometry, state.variant);
      state.predroppable.dropDests = dropDests;
  }
}