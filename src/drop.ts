import { State } from './state'
import * as cg from './types'
import * as board from './board'
import * as util from './util'
import { cancel as cancelDrag } from './drag'
import predrop from "./predrop";
import { callUserFunction } from "./board";

export function setDropMode(s: State, piece?: cg.Piece): void {
  s.dropmode.active = true;
  s.dropmode.piece = piece;

  cancelDrag(s);

  board.unselect(s);

  if (piece && board.isPredroppable(s)) {
    s.predroppable.dropDests = predrop(s.pieces, piece, s.geometry, s.variant);
  }

}

export function cancelDropMode(s: State): void {
  s.dropmode.active = false;
  callUserFunction(s.dropmode.events?.cancel);
}

export function drop(s: State, e: cg.MouchEvent): void {
  if (!s.dropmode.active) return;

  board.unsetPremove(s);
  board.unsetPredrop(s);

  const piece = s.dropmode.piece;

  if (piece) {
    s.pieces.a0 = piece;
    const position = util.eventPosition(e);
    const dest = position && board.getKeyAtDomPos(
      position, board.whitePov(s), s.dom.bounds(), s.geometry);
    if (dest) board.dropNewPiece(s, 'a0', dest);
  }
  s.dom.redraw();
}
