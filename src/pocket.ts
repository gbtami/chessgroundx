import * as cg from './types';
import * as util from './util';
import { dragNewPiece } from './drag';
import { setDropMode, cancelDropMode } from './drop';

import { createEl, letterOf, opposite, pieceClasses as pieceNameOf, roleOf } from "./util";
import { HeadlessState, State } from "./state";
import { Elements, PieceNode } from "./types";
import { lc } from "./commonUtils";
import {predrop} from "./predrop";

// These types maybe belong to ./types.ts, but put here to avoid merge conflicts from upsteam
type Position = 'top' | 'bottom';
export type Pocket = Partial<Record<cg.Role, number>>;
export type Pockets = Partial<Record<cg.Color, Pocket>>;
export type PocketRoles = (color: cg.Color) => string[] | undefined; // type for functions that map a color to possible
                                                                     // pieces that can be in pocket for that side

export const eventsDragging = ['mousedown', 'touchmove'];
export const eventsClicking = ['click'];

/**
 * Logically belongs to fen.ts, but put here to avoid merge conflicts from upsteam
 * Analogous to fen.ts->read(), but for pocket part of FEN
 * TODO: See todo in fen.ts->read() as well. Not sure if pocket parsing belongs there unless return
 *       type is extended to contain pocket state.
 * */
export function readPockets(fen: cg.FEN, pocketRoles: PocketRoles): Pockets | undefined {
    const placement = fen.split(" ")[0];
    const bracketPos = placement.indexOf("[");
    const pocketsFenPart = bracketPos !== -1 ? placement.slice(bracketPos): undefined;

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

export function renderPocketsInitial(state: HeadlessState, elements: Elements, pocketTop?: HTMLElement, pocketBottom?: HTMLElement) {

    function pocketView(position: Position): HTMLElement | undefined {

        function createPocketEl(): HTMLElement {
            const pl = String(roles!.length);
            const files = String(state.dimensions.width);
            const ranks = String(state.dimensions.height);
            const pocketEl = createEl('div','pocket ' + position + ' usable');
            pocketEl.setAttribute('style', `--pocketLength: ${pl}; --files: ${files}; --ranks: ${ranks}`);
            return pocketEl;
        }

        if (!state.pockets) return undefined;

        const color = position === 'top' ? opposite(state.orientation) : state.orientation;
        const pocket = state.pockets[color];
        if (!pocket) return undefined;

        const roles = Object.keys(pocket); // contains the list of possible pieces/roles (i.e. for crazyhouse p-piece, n-piece, b-piece, r-piece, q-piece) in the order they will be displayed in the pocket

        const pocketEl = createPocketEl();
        roles.forEach( (role: string) => {
            const nb = pocket[role as cg.Role] || 0;

            const dropMode = state.dropmode;
            const dropPiece = state.dropmode.piece;
            const selectedSquare = dropMode?.active && dropPiece?.role === role && dropPiece?.color === color;

            const preDropRole = state.predroppable.current?.role;//ctrl.predrop?.role;TODO:niki:test this! not sure about it
            const activeColor = color === state.movable.color;//ctrl.turnColor;

            const pieceName = pieceNameOf( {role: role, color: color, promoted: false} as cg.Piece, state.orientation);
            const p = createEl('piece', pieceName);
            p.setAttribute('data-nb', '' + nb);
            p.setAttribute('data-color', color);//todo;niki:redundant? see also what the story is with that PieceNode/KeyedNode stuff?
            p.setAttribute('data-role', role);//todo;niki:redundant?

            if (activeColor && preDropRole === role){
                p.classList.add('premove');
            } else if (selectedSquare) {
                // after click-drop for predrop, predroppable.current is initialized, but dropmode is not cleared (todo maybe it should - then no need for "else"?)
                p.classList.add('selected-square');
            }

            // todo: i wonder if events.ts->bindBoard() or something similar is a better place for this for some reason?
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
        } ) ;
        return pocketEl;
    }

    //
    if (pocketTop) {
      elements.pocketTop = pocketView("top");
      if (elements.pocketTop) pocketTop.replaceWith(elements.pocketTop);//todo:niki:maybe better to use existing/given pocket0 element instead of replacing it - that is what they do in renderWrap for the chess board
    }
    if (pocketBottom) {
      elements.pocketBottom = pocketView( "bottom");
      if (elements.pocketBottom) pocketBottom.replaceWith(elements.pocketBottom);
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

    if ((!dropMode.active || dropPiece?.role !== role ) && canceledDropMode!=="true") {
        setDropMode(state as State, { color, role });
    } else {
        cancelDropMode(state);
    }
    e.stopPropagation();
    e.preventDefault();
    // renderPockets(state as State);
}

export function drag(state: HeadlessState, e: cg.MouchEvent): void {
    if (e.button !== undefined && e.button !== 0) return; // only touch or left click
    // if (ctrl instanceof RoundController && ctrl.spectator) return;TODO:niki:move to the canDragFromIt boolean
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
        state.dropmode.dropDests=dropDests;
    }

    e.stopPropagation();
    e.preventDefault();
    dragNewPiece(state as State, { color, role }, e);
}

/**
 * Just refreshes each pieces number based on state
 * */
export function renderPockets(state: State) : void {
    let el: PieceNode | undefined = state.dom.elements.pocketTop?.firstChild as (PieceNode | undefined);
    while (el) {
        const role = el.getAttribute("data-role") as string;//cgPiece
        el.setAttribute("data-nb", ''+(state.pockets![opposite(state.orientation)]![role as cg.Role] ?? 0));

        // todo:niki: this repeated below and also in renderPocketInitial
        const color = el.getAttribute("data-color");
        const dropMode = state.dropmode;
        const dropPiece = state.dropmode.piece;
        const selectedSquare = dropMode?.active && dropPiece?.role === role && dropPiece?.color === color;
        const preDropRole = state.predroppable.current?.role;//ctrl.predrop?.role;TODO:niki:test this! not sure about it
        const activeColor = color === state.movable.color;//ctrl.turnColor;

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

        el = el.nextSibling as PieceNode;
    }
    el = state.dom.elements.pocketBottom?.firstChild as (PieceNode | undefined);
    while (el) {
        const role = el.getAttribute("data-role") as string;//cgPiece
        el.setAttribute("data-nb", ''+(state.pockets![state.orientation]![role as cg.Role] ?? 0));

        // todo:niki: this repeated above and also in renderPocketInitial
        const color = el.getAttribute("data-color");
        const dropMode = state.dropmode;
        const dropPiece = state.dropmode.piece;
        const selectedSquare = dropMode?.active && dropPiece?.role === role && dropPiece?.color === color;
        const preDropRole = state.predroppable.current?.role;//ctrl.predrop?.role;TODO:niki:test this! not sure about it
        const activeColor = color === state.movable.color;//ctrl.turnColor;

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

        el = el.nextSibling as PieceNode;
    }
}

function pocket2str(pocket: Pocket) {//todo:niki:was this used - where? why always uppercase?
    const letters: string[] = [];
    for (const role in pocket) {
        letters.push(letterOf(role as cg.Role, true).repeat(pocket[role as cg.Role] || 0));
    }
    return letters.join('');
}

export function pockets2str(pockets: Pockets) {
    return '[' + pocket2str(pockets['white']!) + pocket2str(pockets['black']!).toLowerCase() + ']';//todo;check undefinied for non-symetric variants
}

export function onTurnChangeWhileDraggingOrSelectedPocketPiece(state: HeadlessState): void {
    const piece : cg.Piece | undefined =
    state.dropmode.active ? // TODO: Sometimes dropmode.piece is not cleaned-up (not sure) so best check if active==true
                            //       Maybe clean it in drop.cancelDropMode() together with everything else there?
    state.dropmode.piece :
    state.draggable.current?.piece ?? undefined;

    if (piece){
        // some piece is currently being dragged or selected from pocket (as the changes - which would mean opponent has moved or a premove has executed)
        if (piece.color == state.turnColor) {
          // the active piece is same color as current turn - means we set drop dests
          if (state.movable.dests) {
              const dropDests = new Map([[piece.role, state.movable.dests.get(util.letterOf(piece.role, true) + "@" as cg.Orig)!]]);
              state.dropmode.dropDests = dropDests;
              state.predroppable.dropDests = undefined;
          }
        } else if (state.draggable.current/*only if currently dragging - otherwise should not show those because selecting should not live between turns in case of predrop*/) {
            //it is opponents turn, but we are dragging a pocket piece at the same time (click-drop should not be possible i think)
            const dropDests = predrop(state.pieces, piece, state.geometry, state.variant);
            state.predroppable.dropDests = dropDests;
        }
    }
}