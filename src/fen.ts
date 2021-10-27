import { pos2key, invRanks, roleOf, letterOf } from './util';
import * as cg from './types';
import { Pockets, pockets2str } from './pocket';

export const initial: cg.FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

export function read(fen: cg.FEN): cg.Pieces {
  if (fen === 'start') fen = initial;

  // TODO We will need to read the pocket too when the pocket is incorporated into chessgroundx
  if (fen.includes('[')) fen = fen.slice(0, fen.indexOf('['));
  const pieces: cg.Pieces = new Map();
  let row = fen.split('/').length - 1;
  let col = 0;
  let promoted = false;
  let num = 0;

  for (const c of fen) {
    switch (c) {
      case ' ':
        return pieces;
      case '/':
        --row;
        if (row < 0) return pieces;
        col = 0;
        num = 0;
        break;
      case '+':
        promoted = true;
        break;
      case '~': {
        const piece = pieces.get(pos2key([col - 1, row]));
        if (piece) piece.promoted = true;
        break;
      }
      default: {
        const nb = c.charCodeAt(0);
        if (48 <= nb && nb < 58) {
          num = 10 * num + nb - 48;
        } else {
          col += num;
          num = 0;
          const letter = c.toLowerCase() as cg.PieceLetter;
          const piece = {
            role: roleOf(letter),
            color: (c === letter ? 'black' : 'white') as cg.Color,
          } as cg.Piece;
          if (promoted) {
            piece.role = ('p' + piece.role) as cg.Role;
            piece.promoted = true;
            promoted = false;
          }
          pieces.set(pos2key([col, row]), piece);
          ++col;
        }
      }
    }
  }
  return pieces;
}

export function write(pieces: cg.Pieces, geom: cg.Geometry, pockets?: Pockets): cg.FEN {
  const bd = cg.dimensions[geom];
  return invRanks
    .slice(-bd.height)
    .map(y =>
      cg.files
        .slice(0, bd.width)
        .map(x => {
          const piece = pieces.get((x + y) as cg.Key);
          if (piece) {
            let pieceLetter = letterOf(piece.role, piece.color === 'white');
            if (piece.promoted && pieceLetter.charAt(0) !== '+') pieceLetter += '~';
            return pieceLetter;
          } else return '1';
        })
        .join('')
    )
    .join('/')
    .replace(/1{2,}/g, s => s.length.toString()) + (pockets ? pockets2str(pockets) : "");
}
