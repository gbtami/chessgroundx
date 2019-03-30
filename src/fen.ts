import { pos2key, NRanks, invNRanks } from './util'
import * as cg from './types'

export const initial: cg.FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

const roles8: { [letter: string]: cg.Role } = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king', m: 'met', f: 'ferz', s: 'silver', c: 'cancellor', a: 'archbishop', h: 'hawk', e: 'elephant' };

const roles9: { [letter: string]: cg.Role } = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', g: 'gold', s: 'silver', l: 'lance' };

const roles10: { [letter: string]: cg.Role } = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', c: 'cannon', a: 'advisor' };


const letters8 = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k', met: 'm', ferz: 'f', silver: 's', cancellor: 'c', archbishop: 'a', hawk: 'h', elephant: 'e' };

const letters9 = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', gold: 'g', silver: 's', lance: 'l', plance: 'u',
    ppawn: 'p+', pknight: 'n+', pbishop: 'b+', prook: 'r+', psilver: 's+' };

const letters10 = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', cannon: 'c', advisor: 'a'};


export function read(fen: cg.FEN): cg.Pieces {
  if (fen === 'start') fen = initial;
  if (fen.indexOf('[') !== -1) fen = fen.slice(0, fen.indexOf('['));
  const pieces: cg.Pieces = {};
  let row: number = fen.split("/").length;
  let col: number = 0;
  const roles = row === 10 ? roles10 : row === 9 ? roles9 : roles8;
  const firstRankIs0 = row === 10;
  for (const c of fen) {
    switch (c) {
      case ' ': return pieces;
      case '/':
        --row;
        if (row === 0) return pieces;
        col = 0;
        break;
      case '+':
      case '~':
        const piece = pieces[cg.files[col] + cg.ranks[firstRankIs0 ? row : row + 1]];
        if (piece) {
          piece.promoted = true;
          if (c === '+') piece.role = 'p' + piece.role as cg.Role;
        };
        break;
      default:
        const nb = c.charCodeAt(0);
        if (nb < 58) col += (c === '0') ? 9 : nb - 48;
        else {
          ++col;
          const role = c.toLowerCase();
          pieces[cg.files[col - 1] + cg.ranks[firstRankIs0 ? row - 1 : row]] = {
            role: roles[role],
            color: (c === role ? 'black' : 'white') as cg.Color
          };
        }
    }
  }
  return pieces;
}

export function write(pieces: cg.Pieces, geom: cg.Geometry): cg.FEN {
  const height: number = cg.dimensions[geom].height;
  var letters: any = {};
  switch (height) {
  case 10:
    letters = letters10;
    break;
  case 9:
    letters = letters9;
    break;
  default:
    letters = letters8;
    break
  };
  return invNRanks.map(y => NRanks.map(x => {
      const piece = pieces[pos2key([x, y], geom)];
      if (piece) {
        const letter: string = letters[piece.role];
        return piece.color === 'white' ? letter.toUpperCase() : letter;
      } else return '1';
    }).join('')
  ).join('/').replace(/1{2,}/g, s => s.length.toString());
}
