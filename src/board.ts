import { HeadlessState } from './state.js';
import { pos2key, key2pos, opposite, distanceSq, allPos, computeSquareCenter, roleOf, dropOrigOf, kingRoles, changeNumber, isDropOrig } from './util.js';
import { premove, queen, knight, janggiElephant } from './premove.js';
import { predrop } from './predrop.js';
import * as cg from './types.js';

export function callUserFunction<T extends (...args: any[]) => void>(f: T | undefined, ...args: Parameters<T>): void {
  if (f) setTimeout(() => f(...args), 1);
}

export function toggleOrientation(state: HeadlessState): void {
  state.orientation = opposite(state.orientation);
  state.animation.current = state.draggable.current = state.selected = undefined;
}

export function reset(state: HeadlessState): void {
  state.lastMove = undefined;
  unselect(state);
  unsetPremove(state);
}

export function setPieces(state: HeadlessState, pieces: cg.PiecesDiff): void {
  for (const [key, piece] of pieces) {
    if (piece) state.boardState.pieces.set(key, piece);
    else state.boardState.pieces.delete(key);
  }
}

export function setCheck(state: HeadlessState, color: cg.Color | boolean): void {
  const kings = kingRoles(state.variant);
  state.check = undefined;
  if (color === true) color = state.turnColor;
  if (color)
    for (const [k, p] of state.boardState.pieces) {
      if (kings.includes(p.role) && p.color === color) {
        state.check = k;
        break;
      }
    }
}

function setPremove(state: HeadlessState, orig: cg.Orig, dest: cg.Key, meta: cg.SetPremoveMetadata): void {
  state.premovable.current = [orig, dest];
  callUserFunction(state.premovable.events.set, orig, dest, meta);
}

function setPredrop(state: HeadlessState, role: cg.Role, dest: cg.Key, meta: cg.SetPremoveMetadata): void {
  setPremove(state, dropOrigOf(role), dest, meta);
}

export function unsetPremove(state: HeadlessState): void {
  if (state.premovable.current) {
    state.premovable.current = undefined;
    callUserFunction(state.premovable.events.unset);
  }
}

function tryAutoCastle(state: HeadlessState, orig: cg.Key, dest: cg.Key): boolean {
  if (!state.autoCastle) return false;

  const king = state.boardState.pieces.get(orig);
  if (!king || king.role !== 'k-piece') return false;

  const origPos = key2pos(orig);
  const destPos = key2pos(dest);
  if ((origPos[1] !== 0 && origPos[1] !== 7) || origPos[1] !== destPos[1]) return false;
  if (origPos[0] === 4 && !state.boardState.pieces.has(dest)) {
    if (destPos[0] === 6) dest = pos2key([7, destPos[1]]);
    else if (destPos[0] === 2) dest = pos2key([0, destPos[1]]);
  }
  const rook = state.boardState.pieces.get(dest);
  if (!rook || rook.color !== king.color || rook.role !== 'r-piece') return false;

  state.boardState.pieces.delete(orig);
  state.boardState.pieces.delete(dest);

  if (origPos[0] < destPos[0]) {
    state.boardState.pieces.set(pos2key([6, destPos[1]]), king);
    state.boardState.pieces.set(pos2key([5, destPos[1]]), rook);
  } else {
    state.boardState.pieces.set(pos2key([2, destPos[1]]), king);
    state.boardState.pieces.set(pos2key([3, destPos[1]]), rook);
  }
  return true;
}

export function baseMove(state: HeadlessState, orig: cg.Key, dest: cg.Key): cg.Piece | boolean {
  const origPiece = state.boardState.pieces.get(orig),
    destPiece = state.boardState.pieces.get(dest);
  if (orig === dest || !origPiece) return false;
  const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
  if (dest === state.selected) unselect(state);
  callUserFunction(state.events.move, orig, dest, captured);
  if (!tryAutoCastle(state, orig, dest)) {
    state.boardState.pieces.set(dest, origPiece);
    state.boardState.pieces.delete(orig);
  }
  state.lastMove = [orig, dest];
  state.check = undefined;
  callUserFunction(state.events.change);
  return captured || true;
}

export function baseNewPiece(state: HeadlessState, piece: cg.Piece, key: cg.Key, fromPocket: boolean, force?: boolean): boolean {
  if (state.boardState.pieces.has(key)) {
    if (force) state.boardState.pieces.delete(key);
    else return false;
  }
  callUserFunction(state.events.dropNewPiece, piece, key);
  state.boardState.pieces.set(key, piece);
  if (fromPocket) changeNumber(state.boardState.pockets![piece.color], piece.role, -1);
  state.lastMove = [key];
  state.check = undefined;
  callUserFunction(state.events.change);
  state.movable.dests = undefined;
  state.turnColor = opposite(state.turnColor);
  return true;
}

function baseUserMove(state: HeadlessState, orig: cg.Key, dest: cg.Key): cg.Piece | boolean {
  const result = baseMove(state, orig, dest);
  if (result) {
    state.movable.dests = undefined;
    state.turnColor = opposite(state.turnColor);
    state.animation.current = undefined;
  }
  return result;
}

export function userMove(state: HeadlessState, orig: cg.Key, dest: cg.Key): boolean {
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const holdTime = state.hold.stop();
      unselect(state);
      const metadata: cg.MoveMetadata = {
        premove: false,
        ctrlKey: state.stats.ctrlKey,
        holdTime,
      };
      if (result !== true) metadata.captured = result;
      callUserFunction(state.movable.events.after, orig, dest, metadata);
      return true;
    }
  } else if (canPremove(state, orig, dest)) {
    setPremove(state, orig, dest, {
      ctrlKey: state.stats.ctrlKey,
    });
    unselect(state);
    return true;
  }
  unselect(state);
  return false;
}

export function dropNewPiece(state: HeadlessState, piece: cg.Piece, dest: cg.Key, fromPocket: boolean, force?: boolean): void {
  if (piece && (canDrop(state, piece, dest, fromPocket) || force)) {
    state.boardState.pieces.delete('a0');
    baseNewPiece(state, piece, dest, fromPocket, force);
    state.dropmode.active = false;
    callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, { premove: false });
  } else if (piece && fromPocket && canPredrop(state, piece, dest)) {
    setPredrop(state, piece.role, dest, { ctrlKey: state.stats.ctrlKey });
  } else {
    unsetPremove(state);
    state.dropmode.active = false;
  }
  state.boardState.pieces.delete('a0');
  unselect(state);
}

export function selectSquare(state: HeadlessState, key: cg.Key, force?: boolean): void {
  callUserFunction(state.events.select, key);
  if (state.selected) {
    if (state.selected === key && !state.draggable.enabled) {
      unselect(state);
      state.hold.cancel();
      return;
    } else if ((state.selectable.enabled || force) && state.selected !== key) {
      if (userMove(state, state.selected, key)) {
        state.stats.dragged = false;
        return;
      }
    }
  }
  if ((state.selectable.enabled || state.draggable.enabled) && (isMovable(state, key) || isPremovable(state, key))) {
    setSelected(state, key);
    state.hold.start();
  }
}

export function setSelected(state: HeadlessState, key: cg.Key): void {
  state.selected = key;
  if (isPremovable(state, key)) {
    state.premovable.dests = premove(
      state.boardState.pieces,
      key,
      state.premovable.castle,
      state.dimensions,
      state.variant,
      state.chess960
    );
  } else {
    state.premovable.dests = undefined;
  }
}

export function unselect(state: HeadlessState): void {
  state.selected = undefined;
  state.premovable.dests = undefined;
  state.hold.cancel();
}

function isMovable(state: HeadlessState, orig: cg.Key): boolean {
  const piece = state.boardState.pieces.get(orig);
  return (
    !!piece &&
    (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

function isDroppable(state: HeadlessState, piece: cg.Piece, fromPocket: boolean): boolean {
  const num = state.boardState.pockets?.[piece.color].get(piece.role) ?? 0;
  return (
    (!fromPocket || num > 0) &&
    (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

export const canMove = (state: HeadlessState, orig: cg.Key, dest: cg.Key): boolean =>
  orig !== dest && isMovable(state, orig) && (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest));

export const canDrop = (state: HeadlessState, piece: cg.Piece, dest: cg.Key, fromPocket: boolean): boolean =>
  isDroppable(state, piece, fromPocket) && (state.movable.free || !!state.movable.dests?.get(dropOrigOf(piece.role))?.includes(dest));

function isPremovable(state: HeadlessState, orig: cg.Key): boolean {
  const piece = state.boardState.pieces.get(orig);
  return !!piece && state.premovable.enabled && state.movable.color === piece.color && state.turnColor !== piece.color;
}

export function isPredroppable(state: HeadlessState, piece: cg.Piece): boolean {
  const num = state.boardState.pockets?.[piece.color].get(piece.role) ?? 0;
  return num > 0 && state.premovable.enabled && state.movable.color === piece.color && state.turnColor !== piece.color;
}

const canPremove = (state: HeadlessState, orig: cg.Key, dest: cg.Key): boolean =>
  orig !== dest && isPremovable(state, orig) && premove(state.boardState.pieces, orig, state.premovable.castle, state.dimensions, state.variant, state.chess960).includes(dest);

const canPredrop = (state: HeadlessState, piece: cg.Piece, dest: cg.Key): boolean =>
  !!piece && isPredroppable(state, piece) && predrop(state.boardState.pieces, piece, state.dimensions, state.variant).includes(dest);

export function isDraggable(state: HeadlessState, orig: cg.Key): boolean {
  const piece = state.boardState.pieces.get(orig);
  return (
    !!piece &&
    state.draggable.enabled &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled)))
  );
}

export function playPremove(state: HeadlessState): boolean {
  const move = state.premovable.current;
  if (!move) return false;
  const orig = move[0],
    dest = move[1];
  let success = false;
  if (isDropOrig(orig)) {
    const role = roleOf(orig);
    const piece = {
      role: role,
      color: state.movable.color as cg.Color // Premove is only possible when state.movable.color is 'white' or 'black'
    };
    if (canDrop(state, piece, dest, true)) {
      if (baseNewPiece(state, piece, dest, true)) {
        callUserFunction(state.movable.events.afterNewPiece, role, dest, { premove: true });
        success = true;
      }
    }
  } else {
    if (canMove(state, orig, dest)) {
      const result = baseUserMove(state, orig, dest);
      if (result) {
        const metadata: cg.MoveMetadata = { premove: true };
        if (result !== true) metadata.captured = result;
        callUserFunction(state.movable.events.after, orig, dest, metadata);
        success = true;
      }
    }
  }
  unsetPremove(state);
  return success;
}

export function cancelMove(state: HeadlessState): void {
  unsetPremove(state);
  unselect(state);
}

export function stop(state: HeadlessState): void {
  state.movable.color = state.movable.dests = state.animation.current = undefined;
  cancelMove(state);
}

export function getKeyAtDomPos(
  pos: cg.NumberPair,
  asWhite: boolean,
  bounds: ClientRect,
  bd: cg.BoardDimensions,
): cg.Key | undefined {
  let file = Math.floor((bd.width * (pos[0] - bounds.left)) / bounds.width);
  if (!asWhite) file = bd.width - 1 - file;
  let rank = bd.height - 1 - Math.floor((bd.height * (pos[1] - bounds.top)) / bounds.height);
  if (!asWhite) rank = bd.height - 1 - rank;
  return file >= 0 && file < bd.width && rank >= 0 && rank < bd.height ? pos2key([file, rank]) : undefined;
}

export function getSnappedKeyAtDomPos(
  orig: cg.Key,
  pos: cg.NumberPair,
  asWhite: boolean,
  bounds: ClientRect,
  bd: cg.BoardDimensions,
): cg.Key | undefined {
  const origPos = key2pos(orig);
  const validSnapPos = allPos(bd).filter(pos2 => {
    return  queen(origPos[0], origPos[1], pos2[0], pos2[1]) ||
            knight(origPos[0], origPos[1], pos2[0], pos2[1]) ||
            // Only apply this to 9x10 board to avoid interfering with other variants beside Janggi
            (bd.width === 9 && bd.height === 10 && janggiElephant(origPos[0], origPos[1], pos2[0], pos2[1]));
  });
  const validSnapCenters = validSnapPos.map(pos2 => computeSquareCenter(pos2key(pos2), asWhite, bounds, bd));
  const validSnapDistances = validSnapCenters.map(pos2 => distanceSq(pos, pos2));
  const [, closestSnapIndex] = validSnapDistances.reduce(
    (a, b, index) => (a[0] < b ? a : [b, index]),
    [validSnapDistances[0], 0]
  );
  return pos2key(validSnapPos[closestSnapIndex]);
}

export const whitePov = (s: HeadlessState): boolean => s.orientation === 'white';
