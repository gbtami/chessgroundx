import { State } from './state'
import * as board from './board'
import * as util from './util'
import { clear as drawClear } from './draw'
import * as cg from './types'
import { anim } from './anim'
import predrop from "./predrop";

export interface DragCurrent {
  orig: cg.Key; // orig key of dragging piece
  origPos: cg.Pos;
  piece: cg.Piece;
  rel: cg.NumberPair; // x; y of the piece at original position
  epos: cg.NumberPair; // initial event position
  pos: cg.NumberPair; // relative current position
  dec: cg.NumberPair; // piece center decay
  started: boolean; // whether the drag has started; as per the distance setting
  element: cg.PieceNode | (() => cg.PieceNode | undefined);
  newPiece?: boolean; // it it a new piece from outside the board
  force?: boolean; // can the new piece replace an existing one (editor)
  previouslySelected?: cg.Key;
  originTarget: EventTarget | null;
}

export function start(s: State, e: cg.MouchEvent): void {
  if (e.button !== undefined && e.button !== 0) return; // only touch or left click
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  const bounds = s.dom.bounds(),
  position = util.eventPosition(e) as cg.NumberPair,
  orig = board.getKeyAtDomPos(position, board.whitePov(s), bounds, s.geometry);
  if (!orig) return;
  const piece = s.pieces[orig];
  const previouslySelected = s.selected;
  if (!previouslySelected && s.drawable.enabled && (
    s.drawable.eraseOnClick || (!piece || piece.color !== s.turnColor)
  )) drawClear(s);
  // Prevent touch scroll and create no corresponding mouse event, if there
  // is an intent to interact with the board. If no color is movable
  // (and the board is not for viewing only), touches are likely intended to
  // select squares.
  if (e.cancelable !== false &&
      (!e.touches || !s.movable.color || piece || previouslySelected || pieceCloseTo(s, position)))
       e.preventDefault();
  const hadPremove = !!s.premovable.current;
  const hadPredrop = !!s.predroppable.current;
  s.stats.ctrlKey = e.ctrlKey;
  if (s.selected && board.canMove(s, s.selected, orig)) {
    anim(state => board.selectSquare(state, orig), s);
  } else {
    board.selectSquare(s, orig);
  }
  const stillSelected = s.selected === orig;
  const element = pieceElementByKey(s, orig);
  if (piece && element && stillSelected && board.isDraggable(s, orig)) {
    const squareBounds = computeSquareBounds(orig, board.whitePov(s), bounds, s.dimensions);
    s.draggable.current = {
      orig,
      origPos: util.key2pos(orig),
      piece,
      rel: position,
      epos: position,
      pos: [0, 0],
      dec: s.draggable.centerPiece ? [
        position[0] - (squareBounds.left + squareBounds.width / 2),
        position[1] - (squareBounds.top + squareBounds.height / 2)
      ] : [0, 0],
      started: s.draggable.autoDistance && s.stats.dragged,
      element,
      previouslySelected,
      originTarget: e.target
    };
    element.cgDragging = true;
    element.classList.add('dragging');
    // place ghost
    const ghost = s.dom.elements.ghost;
    if (ghost) {
      const promoted = piece.promoted ? "promoted " : "";
      ghost.className = `ghost ${piece.color} ${promoted}${piece.role}`;
      util.translateAbs(ghost, util.posToTranslateAbs(bounds, s.dimensions)(util.key2pos(orig), board.whitePov(s)));
      util.setVisible(ghost, true);
    }
    processDrag(s);
  } else {
    if (hadPremove) board.unsetPremove(s);
    if (hadPredrop) board.unsetPredrop(s);
  }
  s.dom.redraw();
}

export function pieceCloseTo(s: State, pos: cg.NumberPair): boolean {
  const asWhite = board.whitePov(s),
  bounds = s.dom.bounds(),
  radiusSq = Math.pow(bounds.width / 8, 2);
  for (let key in s.pieces) {
    const squareBounds = computeSquareBounds(key as cg.Key, asWhite, bounds, s.dimensions),
    center: cg.NumberPair = [
      squareBounds.left + squareBounds.width / 2,
      squareBounds.top + squareBounds.height / 2
    ];
    if (util.distanceSq(center, pos) <= radiusSq) return true;
  }
  return false;
}

export function dragNewPiece(s: State, piece: cg.Piece, e: cg.MouchEvent, force?: boolean): void {

  const key: cg.Key = 'a0';

  s.pieces[key] = piece;

  s.dom.redraw();

  const position = util.eventPosition(e) as cg.NumberPair,
  asWhite = board.whitePov(s),
  bounds = s.dom.bounds(),
  squareBounds = computeSquareBounds(key, asWhite, bounds, s.dimensions);

  const rel: cg.NumberPair = [
    (asWhite ? 0 : s.dimensions.width - 1) * squareBounds.width + bounds.left,
    (asWhite ? s.dimensions.height : -1) * squareBounds.height + bounds.top
  ];

  s.draggable.current = {
    orig: key,
    origPos: util.key2pos('a0'),
    piece,
    rel,
    epos: position,
    pos: [position[0] - rel[0], position[1] - rel[1]],
    dec: [-squareBounds.width / 2, -squareBounds.height / 2],
    started: true,
    element: () => pieceElementByKey(s, key),
    originTarget: e.target,
    newPiece: true,
    force: !!force
  };

  if (piece && board.isPredroppable(s)) {
    s.predroppable.dropDests = predrop(s.pieces, piece, s.geometry, s.variant);
  }

  processDrag(s);
}

function processDrag(s: State): void {
  requestAnimationFrame(() => {
    const cur = s.draggable.current;
    if (!cur) return;
    // cancel animations while dragging
    if (s.animation.current && s.animation.current.plan.anims[cur.orig]) s.animation.current = undefined;
    // if moving piece is gone, cancel
    const origPiece = s.pieces[cur.orig];
    if (!origPiece || !util.samePiece(origPiece, cur.piece)) cancel(s);
    else {
      if (!cur.started && util.distanceSq(cur.epos, cur.rel) >= Math.pow(s.draggable.distance, 2)) cur.started = true;
      if (cur.started) {

        // support lazy elements
        if (typeof cur.element === 'function') {
          const found = cur.element();
          if (!found) return;
          found.cgDragging = true;
          found.classList.add('dragging');
          cur.element = found;
        }

        cur.pos = [
          cur.epos[0] - cur.rel[0],
          cur.epos[1] - cur.rel[1]
        ];

        // move piece
        const translation = util.posToTranslateAbs(s.dom.bounds(), s.dimensions)(cur.origPos, board.whitePov(s));
        translation[0] += cur.pos[0] + cur.dec[0];
        translation[1] += cur.pos[1] + cur.dec[1];
        util.translateAbs(cur.element, translation);
      }
    }
    processDrag(s);
  });
}

export function move(s: State, e: cg.MouchEvent): void {
  // support one finger touch only
  if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
    s.draggable.current.epos = util.eventPosition(e) as cg.NumberPair;
  }
}

export function end(s: State, e: cg.MouchEvent): void {
  const cur = s.draggable.current;
  if (!cur) return;
  // create no corresponding mouse event
  if (e.type === 'touchend' && e.cancelable !== false) e.preventDefault();
  // comparing with the origin target is an easy way to test that the end event
  // has the same touch origin
  if (e.type === 'touchend' && cur && cur.originTarget !== e.target && !cur.newPiece) {
    s.draggable.current = undefined;
    return;
  }
  board.unsetPremove(s);
  board.unsetPredrop(s);
  // touchend has no position; so use the last touchmove position instead
  const eventPos: cg.NumberPair = util.eventPosition(e) || cur.epos;
  const dest = board.getKeyAtDomPos(eventPos, board.whitePov(s), s.dom.bounds(), s.geometry);
  if (dest && cur.started && cur.orig !== dest) {
    if (cur.newPiece) board.dropNewPiece(s, cur.orig, dest, cur.force);
    else {
      s.stats.ctrlKey = e.ctrlKey;
      if (board.userMove(s, cur.orig, dest)) s.stats.dragged = true;
    }
  } else if (cur.newPiece) {
    delete s.pieces[cur.orig];
  } else if (s.draggable.deleteOnDropOff && !dest) {
    delete s.pieces[cur.orig];
    board.callUserFunction(s.events.change);
  }
  if (cur && cur.orig === cur.previouslySelected && (cur.orig === dest || !dest))
    board.unselect(s);
  else if (!s.selectable.enabled) board.unselect(s);

  removeDragElements(s);

  s.draggable.current = undefined;
  s.dom.redraw();
}

export function cancel(s: State): void {
  const cur = s.draggable.current;
  if (cur) {
    if (cur.newPiece) delete s.pieces[cur.orig];
    s.draggable.current = undefined;
    board.unselect(s);
    removeDragElements(s);
    s.dom.redraw();
  }
}

function removeDragElements(s: State) {
  const e = s.dom.elements;
  if (e.ghost) util.setVisible(e.ghost, false);
}

function computeSquareBounds(key: cg.Key, asWhite: boolean, bounds: ClientRect, bd: cg.BoardDimensions) {
  const pos = util.key2pos(key);
  if (!asWhite) {
    pos[0] = bd.width + 1 - pos[0];
    pos[1] = bd.height + 1 - pos[1];
  }
  return {
    left: bounds.left + bounds.width * (pos[0] - 1) / bd.width,
    top: bounds.top + bounds.height * (bd.height - pos[1]) / bd.height,
    width: bounds.width / bd.width,
    height: bounds.height / bd.height
  };
}

function pieceElementByKey(s: State, key: cg.Key): cg.PieceNode | undefined {
  let el = s.dom.elements.board.firstChild as cg.PieceNode;
  while (el) {
    if (el.cgKey === key && el.tagName === 'PIECE') return el;
    el = el.nextSibling as cg.PieceNode;
  }
  return undefined;
}
