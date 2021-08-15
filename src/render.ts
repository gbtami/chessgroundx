import { State } from './state'
import { key2pos, createEl } from './util'
import { whitePov } from './board'
import * as util from './util'
import { AnimCurrent, AnimVectors, AnimVector, AnimFadings } from './anim'
import { DragCurrent } from './drag'
import * as cg from './types'

// `$color $role`
type PieceName = string;

interface SamePieces { [key: string]: boolean }
interface SameSquares { [key: string]: boolean }
interface MovedPieces { [pieceName: string]: cg.PieceNode[] }
interface MovedSquares { [className: string]: cg.SquareNode[] }
interface SquareClasses { [key: string]: string }

// ported from https://github.com/veloce/lichobile/blob/master/src/js/chessground/view.js
// in case of bugs, blame @veloce
export default function render(s: State): void {
  const asWhite: boolean = whitePov(s),
  posToTranslate = s.dom.relative ? util.posToTranslateRel : util.posToTranslateAbs(s.dom.bounds(), s.dimensions),
  translate = s.dom.relative ? util.translateRel : util.translateAbs,
  boardEl: HTMLElement = s.dom.elements.board,
  pieces: cg.Pieces = s.pieces,
  curAnim: AnimCurrent | undefined = s.animation.current,
  anims: AnimVectors = curAnim ? curAnim.plan.anims : {},
  fadings: AnimFadings = curAnim ? curAnim.plan.fadings : {},
  curDrag: DragCurrent | undefined = s.draggable.current,
  squares: SquareClasses = computeSquareClasses(s),
  samePieces: SamePieces = {},
  sameSquares: SameSquares = {},
  movedPieces: MovedPieces = {},
  movedSquares: MovedSquares = {},
  piecesKeys: cg.Key[] = Object.keys(pieces) as cg.Key[];
  let k: cg.Key,
  p: cg.Piece | undefined,
  el: cg.PieceNode | cg.SquareNode,
  pieceAtKey: cg.Piece | undefined,
  elPieceName: PieceName,
  anim: AnimVector | undefined,
  fading: cg.Piece | undefined,
  pMvdset: cg.PieceNode[],
  pMvd: cg.PieceNode | undefined,
  sMvdset: cg.SquareNode[],
  sMvd: cg.SquareNode | undefined;

  // walk over all board dom elements, apply animations and flag moved pieces
  el = boardEl.firstChild as cg.PieceNode | cg.SquareNode;
  while (el) {
    k = el.cgKey;
    if (isPieceNode(el)) {
      pieceAtKey = pieces[k];
      anim = anims[k];
      fading = fadings[k];
      elPieceName = el.cgPiece;
      // if piece not being dragged anymore, remove dragging style
      if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
        el.classList.remove('dragging');
        translate(el, posToTranslate(key2pos(k), asWhite, s.dimensions));
        el.cgDragging = false;
      }
      // remove fading class if it still remains
      if (!fading && el.cgFading) {
        el.cgFading = false;
        el.classList.remove('fading');
      }
      // there is now a piece at this dom key
      if (pieceAtKey) {
        // continue animation if already animating and same piece
        // (otherwise it could animate a captured piece)
        if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
          const pos = key2pos(k);
          pos[0] += anim[2];
          pos[1] += anim[3];
          el.classList.add('anim');
          translate(el, posToTranslate(pos, asWhite, s.dimensions));
        } else if (el.cgAnimating) {
          el.cgAnimating = false;
          el.classList.remove('anim');
          translate(el, posToTranslate(key2pos(k), asWhite, s.dimensions));
          if (s.addPieceZIndex) el.style.zIndex = posZIndex(key2pos(k), asWhite);
        }
        // same piece: flag as same
        if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
          samePieces[k] = true;
        }
        // different piece: flag as moved unless it is a fading piece
        else {
          if (fading && elPieceName === pieceNameOf(fading)) {
            el.classList.add('fading');
            el.cgFading = true;
          } else {
            if (movedPieces[elPieceName]) movedPieces[elPieceName].push(el);
            else movedPieces[elPieceName] = [el];
          }
        }
      }
      // no piece: flag as moved
      else {
        if (movedPieces[elPieceName]) movedPieces[elPieceName].push(el);
        else movedPieces[elPieceName] = [el];
      }
    }
    else if (isSquareNode(el)) {
      const cn = el.className;
      if (squares[k] === cn) sameSquares[k] = true;
      else if (movedSquares[cn]) movedSquares[cn].push(el);
      else movedSquares[cn] = [el];
    }
    el = el.nextSibling as cg.PieceNode | cg.SquareNode;
  }

  // walk over all squares in current set, apply dom changes to moved squares
  // or append new squares
  for (const sk in squares) {
    if (!sameSquares[sk]) {
      sMvdset = movedSquares[squares[sk]];
      sMvd = sMvdset && sMvdset.pop();
      const translation = posToTranslate(key2pos(sk as cg.Key), asWhite, s.dimensions);
      if (sMvd) {
        sMvd.cgKey = sk as cg.Key;
        translate(sMvd, translation);
      }
      else {
        const squareNode = createEl('square', squares[sk]) as cg.SquareNode;
        squareNode.cgKey = sk as cg.Key;
        translate(squareNode, translation);
        boardEl.insertBefore(squareNode, boardEl.firstChild);
      }
    }
  }

  // walk over all pieces in current set, apply dom changes to moved pieces
  // or append new pieces
  for (const j in piecesKeys) {
    k = piecesKeys[j];
    p = pieces[k]!;
    anim = anims[k];
    if (!samePieces[k]) {
      pMvdset = movedPieces[pieceNameOf(p)];
      pMvd = pMvdset && pMvdset.pop();
      // a same piece was moved
      if (pMvd) {
        // apply dom changes
        pMvd.cgKey = k;
        if (pMvd.cgFading) {
          pMvd.classList.remove('fading');
          pMvd.cgFading = false;
        }
        const pos = key2pos(k);
        if (s.addPieceZIndex) pMvd.style.zIndex = posZIndex(pos, asWhite);
        if (anim) {
          pMvd.cgAnimating = true;
          pMvd.classList.add('anim');
          pos[0] += anim[2];
          pos[1] += anim[3];
        }
        translate(pMvd, posToTranslate(pos, asWhite, s.dimensions));
      }
      // no piece in moved obj: insert the new piece
      // assumes the new piece is not being dragged
      else {

        const pieceName = pieceNameOf(p),
        pieceNode = createEl('piece', pieceName) as cg.PieceNode,
        pos = key2pos(k);

        pieceNode.cgPiece = pieceName;
        pieceNode.cgKey = k;
        if (anim) {
          pieceNode.cgAnimating = true;
          pos[0] += anim[2];
          pos[1] += anim[3];
        }
        translate(pieceNode, posToTranslate(pos, asWhite, s.dimensions));

        if (s.addPieceZIndex) pieceNode.style.zIndex = posZIndex(pos, asWhite);

        boardEl.appendChild(pieceNode);
      }
    }
  }

  // remove any element that remains in the moved sets
  for (const i in movedPieces) removeNodes(s, movedPieces[i]);
  for (const i in movedSquares) removeNodes(s, movedSquares[i]);
}

function isPieceNode(el: cg.PieceNode | cg.SquareNode): el is cg.PieceNode {
  return el.tagName === 'PIECE';
}
function isSquareNode(el: cg.PieceNode | cg.SquareNode): el is cg.SquareNode {
  return el.tagName === 'SQUARE';
}

function removeNodes(s: State, nodes: HTMLElement[]): void {
  for (const i in nodes) s.dom.elements.board.removeChild(nodes[i]);
}

function posZIndex(pos: cg.Pos, asWhite: boolean): string {
  let z = 2 + (pos[1] - 1) * 8 + (8 - pos[0]);
  if (asWhite) z = 67 - z;
  return z + '';
}

function pieceNameOf(piece: cg.Piece): string {
  const promoted = piece.promoted ? "promoted " : "";
  return `${piece.color} ${promoted}${piece.role}`;
}

function computeSquareClasses(s: State): SquareClasses {
  const squares: SquareClasses = {};
  let i: any, k: cg.Key;
  if (s.lastMove && s.highlight.lastMove) for (i in s.lastMove) {
    if (s.lastMove[i] != 'a0') {
      addSquare(squares, s.lastMove[i], 'last-move');
    }
  }
  if (s.check && s.highlight.check) addSquare(squares, s.check, 'check');
  if (s.selected) {
    addSquare(squares, s.selected, 'selected');
    if (s.movable.showDests) {
      const dests = s.movable.dests && s.movable.dests[s.selected];
      if (dests) for (i in dests) {
        k = dests[i];
        addSquare(squares, k, 'move-dest' + (s.pieces[k] ? ' oc' : ''));
      }
      const pDests = s.premovable.dests;
      if (pDests) for (i in pDests) {
        k = pDests[i];
        addSquare(squares, k, 'premove-dest' + (s.pieces[k] ? ' oc' : ''));
      }
    }
  } else if (s.dropmode.active || s.draggable.current?.orig === 'a0') {
    const piece = s.dropmode.active ? s.dropmode.piece : s.draggable.current?.piece;

    if (piece) {
      // TODO: there was a function called isPredroppable that was used in drag.ts or drop.ts or both.
      //       Maybe use the same here to decide what to render instead of potentially making it possible both
      //       kinds of highlighting to happen if something was not cleared up in the state.
      //       In other place (pocket.ts) this condition is used ot decide similar question: ctrl.mycolor === ctrl.turnColor
      if (s.dropmode.showDropDests) {
        const dests = s.dropmode.dropDests?.get(piece.role);
        if (dests)
          for (const k of dests) {
            addSquare(squares, k, 'move-dest');
          }
      }
      if (s.predroppable.showDropDests) {
        const pDests = s.predroppable.dropDests;
        if (pDests)
          for (const k of pDests) {
            addSquare(squares, k, 'premove-dest' + (s.pieces[k] ? ' oc' : ''));
          }
      }
    }
  }
  const premove = s.premovable.current;
  if (premove) for (i in premove) addSquare(squares, premove[i], 'current-premove');
  else if (s.predroppable.current) addSquare(squares, s.predroppable.current.key, 'current-premove');

  const o = s.exploding;
  if (o) for (i in o.keys) addSquare(squares, o.keys[i], 'exploding' + o.stage);

  return squares;
}

function addSquare(squares: SquareClasses, key: cg.Key, klass: string): void {
  if (squares[key]) squares[key] += ' ' + klass;
  else squares[key] = klass;
}
