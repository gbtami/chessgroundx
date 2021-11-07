import { HeadlessState, State } from './state';
import * as cg from './types';
import * as board from './board';
import * as util from './util';
import { cancel as dragCancel } from './drag';
import { predrop } from './predrop';

export function setDropMode(s: State, piece?: cg.Piece): void {
  s.dropmode.active = true;
  s.dropmode.piece = piece;

  dragCancel(s);
  board.unselect(s);
  if (piece) {
    if (board.isPredroppable(s)) {
      s.predroppable.dropDests = predrop(s.pieces, piece, s.geometry, s.variant);
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
    s.pieces.set('a0', piece);
    const position = util.eventPosition(e);
    const dest = position && board.getKeyAtDomPos(position, board.whitePov(s), s.dom.bounds(), s.geometry);
    if (dest) board.dropNewPiece(s, 'a0', dest);
  }
  s.dom.redraw();
}
