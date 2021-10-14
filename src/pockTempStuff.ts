import * as cg from "./types";
import { Pocket } from "./pocket";
import { predrop } from "./predrop";
import { opposite, roleOf } from "./util";
import * as util from "./util";
import { HeadlessState } from "./state";
import { lc } from "./commonUtils";

export function getPockets(fen: string): string {
    const placement = fen.split(" ")[0];
    let pockets = "";
    const bracketPos = placement.indexOf("[");
    if (bracketPos !== -1)
        pockets = placement.slice(bracketPos);
    return pockets;
}

export function initPockets(state: HeadlessState): void {
    let pockets = "";
    if (state.pockets.fen) {
        const parts = state.pockets.fen.split(" ");
        const fen_placement = parts[0];
        const bracketPos = fen_placement.indexOf("[");
        if (bracketPos !== -1) {
            pockets = fen_placement.slice(bracketPos);
        }
    }
    const rWhite = state.pockets.pocketRoles('white') ?? [];
    const rBlack = state.pockets.pocketRoles('black') ?? [];
    const pWhite: Pocket = {};
    const pBlack: Pocket = {};
    rWhite.forEach(r => pWhite[roleOf(r as cg.PieceLetter)] = lc(pockets, r, true));
    rBlack.forEach(r => pBlack[roleOf(r as cg.PieceLetter)] = lc(pockets, r, false));
    state.pockets.pockets!.white = pWhite;
    state.pockets.pockets!.black = pBlack;
}

export function updatePocks(fen: cg.FEN, state: HeadlessState): void {
    const pocketsChanged = state.pockets.fen === undefined || /*TODO:niki: is this method called for non-pocket variants that would make this check needed? this.ctrl.hasPockets &&*/
        (getPockets(state.pockets.fen) !== getPockets(fen));
    state.pockets.fen = fen;
    if (pocketsChanged) {
        initPockets(state);
       // refreshPockets(state as State);
    }
}

export function handleDrop(piece: cg.Piece, state: HeadlessState): void {
    state.pockets.pockets![piece.color]![piece.role]! --;
}

export function handleCapture(state: HeadlessState, capturedPiece: cg.Piece): void {
    state.pockets.pockets![opposite(capturedPiece.color)]![capturedPiece.role]! ++;
}

export function handleTurnChange(state: HeadlessState): void {

    const piece : cg.Piece | undefined =
    state.dropmode.active ? // TODO: Sometimes dropmode.piece is not cleaned-up so best check if active==true. Maybe clean it in drop.cancelDropMode() together with everything else there?
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
        } else {
            //it is opponents turn, but we are dragging a pocket piece at the same time (click-drop should not be possible i think)
            const dropDests = predrop(state.pieces, piece, state.geometry, state.variant);
            state.predroppable.dropDests = dropDests;
        }
    }
}
