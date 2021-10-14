import * as cg from './types';
import * as util from './util';
import { dragNewPiece } from './drag';
import { setDropMode, cancelDropMode } from './drop';

import {createEl, letterOf, opposite, pieceClasses as pieceNameOf} from "./util";
import { HeadlessState, State } from "./state";
import { PieceNode } from "./types";

type Position = 'top' | 'bottom';

export type Pocket = Partial<Record<cg.Role, number>>;
export type Pockets = Partial<Record<cg.Color, Pocket>>;

export const eventsDragging = ['mousedown', 'touchmove'];
export const eventsClicking = ['click'];
export const eventsDropping = ['mouseup', 'touchend']; // relevant for editor

export function createPocketEl(state: HeadlessState, position: Position){
    const pocket = state.pockets.pockets![position === 'top' ? opposite(state.orientation) : state.orientation];
    const roles = Object.keys(pocket!); //todo;niki;handle undefinied where - what was that variant with only 1 pocket? how was it handled before // contains the list of possible pieces/roles (i.e. for crazyhouse p-piece, n-piece, b-piece, r-piece, q-piece) in the order they will be displayed in the pocket

    const pl = String(roles!.length);
    const files = String(state.dimensions.width);
    const ranks = String(state.dimensions.height);
    const pocketEl = createEl('div','pocket ' + position + ' usable');
    pocketEl.setAttribute('style', `--pocketLength: ${pl}; --files: ${files}; --ranks: ${ranks}`);
    return pocketEl;
}

/*
* */
export function pocketView(state: HeadlessState, position: Position) {
    // const chessground = pockStateStuff.chessground;
    const color = position === 'top' ? opposite(state.orientation) : state.orientation;
    const pocket = state.pockets!.pockets![color];
    const roles = Object.keys(pocket!); // contains the list of possible pieces/roles (i.e. for crazyhouse p-piece, n-piece, b-piece, r-piece, q-piece) in the order they will be displayed in the pocket

    const pocketEl = createPocketEl(state, position);
    roles.forEach( (role: /*cg.Role*/string) => {
        const nb = pocket![role as cg.Role] || 0;

        const dropMode = state.dropmode;
        const dropPiece = state.dropmode.piece;
        const selectedSquare = dropMode?.active && dropPiece?.role === role && dropPiece?.color === color;

        // if (ctrl instanceof RoundController) { TODO:niki:in what cases is this check really needed ? can this code actually run and something appear as predrop without actually having to?
        const preDropRole = state.predroppable.current?.role;//ctrl.predrop?.role;TODO:niki:test this! not sure about it
        const activeColor = color === state.movable.color;//ctrl.turnColor;

        const pieceName = pieceNameOf( {role: role, color: color, promoted: false} as cg.Piece, state.orientation);
        const p = createEl('piece', pieceName);
        p.setAttribute('data-nb', ''+nb);
        p.setAttribute('test', 'test');
        p.setAttribute('data-color', color);//todo;niki:redundant? see also what the story is with that PieceNode/KeyedNode stuff?
        p.setAttribute('data-role', role);//todo;niki:redundant?

        if (activeColor && preDropRole === role) p.classList.add('premove');
        if (selectedSquare) p.classList.add('selected-square');

        //todo:niki:or in event.ts like event.bindBoard?
        eventsDragging.forEach(name =>
            p.addEventListener(name, (e: cg.MouchEvent) => {
                if (state.movable.free || state.movable.color === color) drag(state, e);
            })
        );
        eventsDropping.forEach(name =>//todo:niki:maybe this belongs outside CG? not really part of the board mechanics
            p.addEventListener(name, (e: cg.MouchEvent) => {
                if (state.movable.free) drop(state, e);
            })
        );
        eventsClicking.forEach(name =>
            p.addEventListener(name, (e: cg.MouchEvent) => {
                if (state.movable.free || state.movable.color === color) click(state, e);
            })
        );

        pocketEl.appendChild(p);

    } ) ;
    return pocketEl;
}

export function click(state: HeadlessState/*ctrl: EditorController | RoundController | AnalysisController*/, e: cg.MouchEvent): void {
    // const chessground = pockStateStuff.chessground;

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

        // TODO:move below lines to drop.ts -> setDropMode
        // if (ctrl instanceof RoundController || ctrl instanceof AnalysisController) {TODO:niki:see same commented if in drag()
            if (state.movable.dests/*very first move with white might be undef*/) {
                const dropDests = new Map([ [role, state.movable.dests.get(util.letterOf(role, true) + "@" as cg.Orig)! ] ]); // TODO:ideally pocket.ts should move to chessgroundx so dests must be set directly in the controller
                state.dropmode.active=true;
                state.dropmode.dropDests=dropDests;
            }
        // }

    } else {
        cancelDropMode(state);
    }
    e.stopPropagation();
    e.preventDefault();
    refreshPockets(state as State);
}

export function drag(state: HeadlessState/*pockStateStuff: PockStateStuff*//*EditorController | RoundController | AnalysisController*/, e: cg.MouchEvent): void {
    // const chessground = pockStateStuff.chessground;

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

    //TODO:niki: hmm? is this even a good idea? does drag always result in deleting no matter what? maybe this should go in some event listener?
    // if (ctrl instanceof EditorController) { // immediately decrease piece count for editor
    //     let index = color === 'white' ? 1 : 0;
    //     if (ctrl.flip) index = 1 - index;
    //     ctrl.pockStateStuff.pockets[index][role]!--;
    //     refreshPockets(ctrl.pockStateStuff);
    //     ctrl.onChange();
    // }

    // if (ctrl instanceof RoundController || ctrl instanceof AnalysisController) {//TODO:niki:maybe checking for chessground.movable.dests is enough - maybe editor does not init that ever
        if (state.movable.dests/*very first move with white might be undef - also editor probably always undef?*/) {
            const dropDests = new Map([[role, state.movable.dests.get(util.letterOf(role, true) + "@" as cg.Orig)!]]); // TODO:imho ideally pocket.ts should move to chessgroundx - this (ctrl.dests) then might not be accessible - is it?
            state.dropmode.dropDests=dropDests;
        }
    // }

    e.stopPropagation();
    e.preventDefault();
    dragNewPiece(state as State, { color, role }, e);
}

export function drop(state: HeadlessState, e: cg.MouchEvent): void {
    console.log("pocket drop()");
    const el = e.target as HTMLElement;
    const piece = state.draggable.current?.piece;
    console.log(piece);
    if (piece) {
        const role = piece.role;//TODO:niki:unpromotedRole(/*pockStateStuff.variant TODO:niki:what about this?*/VARIANTS.chess, piece);
        const color = el.getAttribute('data-color') as cg.Color;
        // let index = color === 'white' ? 1 : 0;
        // if (isFlipped(state)) index = 1 - index;
        const pocket = state.pockets.pockets![color];
        console.log(role);
        console.log(color);
        // console.log(index);
        console.log(pocket);
        if (role in pocket!) {
            pocket![role]!++;
            refreshPockets(state as State);
            // ctrl.onChange();//TODO:niki:what to do with this - call somehow via chessground
        }
    }
}

export function refreshPockets(state: State) : void {
    let el: cg.PieceNode = state.dom.elements.pocketTop!.firstChild as PieceNode;
    while (el){
        const role = el.getAttribute("data-role") as string;//cgPiece
        el.setAttribute("data-nb", ''+(state.pockets.pockets![opposite(state.orientation)]![role as cg.Role] ?? 0));
        el = el.nextSibling as PieceNode;
    }
    el = state.dom.elements.pocketBottom!.firstChild as PieceNode;
    while (el){
        const role = el.getAttribute("data-role") as string;//cgPiece
        el.setAttribute("data-nb", ''+(state.pockets.pockets![state.orientation]![role as cg.Role] ?? 0));
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
    return '[' + pocket2str(pockets['white']!) + pocket2str(pockets['black']!).toLowerCase() + ']';
}
