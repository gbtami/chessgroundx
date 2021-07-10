import { State } from './state'
import * as cg from './types'
import * as board from './board'
import * as util from './util'
import { cancel as cancelDrag } from './drag'

export function setDropMode(s: State, piece?: cg.Piece): void {
  s.dropmode.active = true;
  s.dropmode.piece = piece;

  cancelDrag(s);

  board.unselect(s);//TODO:in lishogi they do this - what does it change?

  //TODO: adapt to pychess - apparently the calc of dests is done here
  // if (piece && board.isPredroppable(s)) {
  //   s.predroppable.dropDests = predrop(s.pieces, piece);
  // }

}

export function cancelDropMode(s: State): void {
  s.dropmode.active = false;
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
