import { pos2key, NRanks, invNRanks } from './util'
import * as cg from './types'

export const initial: cg.FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

function roles(letter: string) {
  return (letter.replace("+", "p") + "-piece") as cg.Role;
}

function letters(role: cg.Role) {
  const letterPart = role.slice(0, role.indexOf('-'));
  return (letterPart.length > 1) ? letterPart.replace('p', '+') : letterPart;
}

export function read(fen: cg.FEN): cg.Pieces {
  if (fen === 'start') fen = initial;
  if (fen.indexOf('[') !== -1) fen = fen.slice(0, fen.indexOf('['));
  const pieces: cg.Pieces = {};
  let row: number = fen.split("/").length;
  let col: number = 0;
  let promoted: boolean = false;
  let num = 0;

  for (const c of fen) {
    switch (c) {
      case ' ': return pieces;
      case '/':
        --row;
        if (row === 0) return pieces;
        col = 0;
        num = 0;
        break;
      case '+':
        promoted = true;
        break;
      case '~':
        const piece = pieces[pos2key([col, row])];
        if (piece) {
          piece.promoted = true;
        }
        break;
      default:
        const nb = c.charCodeAt(0);
        if (48 <= nb && nb < 58) {
          num = 10 * num + nb - 48;
        } else {
          col += 1 + num;
          num = 0;
          const letter = c.toLowerCase();
          let piece = {
            role: roles(letter),
            color: (c === letter ? 'black' : 'white') as cg.Color
          } as cg.Piece;
          if (promoted) {
            piece.role = ('p' + piece.role) as cg.Role;
            piece.promoted = true;
            promoted = false;
          };
          pieces[pos2key([col, row])] = piece;
        }
    }
  }
  return pieces;
}

export function write(pieces: cg.Pieces, geom: cg.Geometry): cg.FEN {
  const bd = cg.dimensions[geom];
  return invNRanks.slice(-bd.height).map(y => NRanks.slice(0, bd.width).map(x => {
      const piece = pieces[pos2key([x, y])];
      if (piece) {
        const letter: string = letters(piece.role) + ((piece.promoted && (letters(piece.role).charAt(0) !== '+')) ? '~' : '');
        return (piece.color === 'white') ? letter.toUpperCase() : letter;
      } else return '1';
    }).join('')
  ).join('/').replace(/1{2,}/g, s => s.length.toString());
}
