import { HeadlessState, State } from './state.js';
import * as cg from './types.js';
import * as board from './board.js';
import * as util from './util.js';
import { cancel as dragCancel } from './drag.js';
import { predrop } from './predrop.js';

export function setDropMode(s: State, piece?: cg.Piece): void {
  s.dropmode.active = true;
  s.dropmode.piece = piece;

  dragCancel(s);
  board.unselect(s);
  if (piece) {
    if (board.isPredroppable(s)) {
      s.predroppable.dropDests = predrop(s.boardState.pieces, piece, s.dimensions, s.variant);
    } else {
      if (s.movable.dests) {
        const dropDests = new Map([[piece.role, s.movable.dests.get(util.dropOrigOf(piece.role))!]]);
        s.dropmode.active = true;
        s.dropmode.dropDests = dropDests;
      }
    }
  }
}

export function cancelDropMode(s: HeadlessState): void {
  s.dropmode.active = false;
}

export function drop(s: State, e: cg.MouchEvent): void {
  if (!s.dropmode.active) return;

  board.unsetPremove(s);
  board.unsetPredrop(s);

  const piece = s.dropmode.piece;

  if (piece) {
    s.boardState.pieces.set('a0', piece);
    const position = util.eventPosition(e);
    const dest = position && board.getKeyAtDomPos(position, board.whitePov(s), s.dom.bounds(), s.dimensions);
    if (dest) board.dropNewPiece(s, 'a0', dest);
  }
  s.dom.redraw();
}
