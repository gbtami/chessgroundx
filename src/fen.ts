import { pos2key, NRanks, invNRanks } from './util'
import * as cg from './types'

export const initial: cg.FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

const rolesVariants: { [letter: string]: cg.Role } = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king',
    m: 'met', f: 'ferz', s: 'silver', c: 'chancellor', a: 'archbishop',
    h: 'hawk', e: 'elephant', y: 'yurt', l: 'lancer', u: 'unicorn', d: 'dragon', o: 'cannon'};
// shogi
const rolesShogi: { [letter: string]: cg.Role } = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', g: 'gold', s: 'silver', l: 'lance' };
// dobutsu
const rolesDobutsu: { [letter: string]: cg.Role } = {
    c: 'chancellor', e: 'elephant', l: 'king', g: 'gold', h: 'hawk' };
// xiangqi
const rolesXiangqi: { [letter: string]: cg.Role } = {
    p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', k: 'king', c: 'cannon', a: 'advisor', m: 'banner' };


const lettersVariants = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k', met: 'm', ferz: 'f', silver: 's', chancellor: 'c', archbishop: 'a', hawk: 'h', elephant: 'e',
    ppawn: '+p', pknight: '+n', pbishop: '+b', prook: '+r', pferz: '+f', yurt: 'y', lancer: 'l',
    unicorn: 'u', dragon: 'd', cannon: 'o'};
// shogi
const lettersShogi = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', gold: 'g', silver: 's', lance: 'l',
    ppawn: '+p', pknight: '+n', pbishop: '+b', prook: '+r', psilver: '+s', plance: '+l' };
// dobutsu
const lettersDobutsu = {
    chancellor: 'c', elephant: 'e', king: 'l', gold: 'g', hawk: 'h',
    pchancellor: '+c'};
// xiangqi
const lettersXiangqi = {
    pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', king: 'k', cannon: 'c', advisor: 'a', banner: 'm'};

export function read(fen: cg.FEN, geom: cg.Geometry): cg.Pieces {
  if (fen === 'start') fen = initial;
  if (fen.indexOf('[') !== -1) fen = fen.slice(0, fen.indexOf('['));
  const pieces: cg.Pieces = {};
  let row: number = fen.split("/").length;
  let col: number = 0;
  let promoted: boolean = false;

  let roles = rolesVariants;
  switch (geom) {
    case cg.Geometry.dim9x10:
    case cg.Geometry.dim7x7:
        roles = rolesXiangqi;
        break;
    case cg.Geometry.dim9x9:
    case cg.Geometry.dim5x5:
        roles = rolesShogi;
        break;
    case cg.Geometry.dim3x4:
        roles = rolesDobutsu;
        break;
  }

  for (const c of fen) {
    switch (c) {
      case ' ': return pieces;
      case '/':
        --row;
        if (row === 0) return pieces;
        col = 0;
        break;
      case '+':
        promoted = true;
        break;
      case '~':
        const piece = pieces[pos2key([col, row], geom)];
        if (piece) {
            piece.promoted = true;
            if (piece.role=='met') piece.role = 'ferz';
        };
        break;
      default:
        const nb = c.charCodeAt(0);
        if (nb < 58) col += (c === '0') ? 9 : nb - 48;
        else {
          ++col;
          const role = c.toLowerCase();
          let piece = {
            role: roles[role],
            color: (c === role ? 'black' : 'white') as cg.Color
          } as cg.Piece;
          if (promoted) {
            piece.role = 'p' + piece.role as cg.Role;
            piece.promoted = true;
            promoted = false;
          };
          pieces[pos2key([col, row], geom)] = piece;
        }
    }
  }
  return pieces;
}

export function write(pieces: cg.Pieces, geom: cg.Geometry): cg.FEN {
  var letters: any = {};
  switch (geom) {
  case cg.Geometry.dim7x7:
  case cg.Geometry.dim9x10:
    letters = lettersXiangqi;
    break;
  case cg.Geometry.dim3x4:
    letters = lettersDobutsu;
    break;
  case cg.Geometry.dim5x5:
  case cg.Geometry.dim9x9:
    letters = lettersShogi;
    break;
  default:
    letters = lettersVariants;
    break
  };
  const bd = cg.dimensions[geom];
  return invNRanks.slice(-bd.height).map(y => NRanks.slice(0, bd.width).map(x => {
      const piece = pieces[pos2key([x, y], geom)];
      if (piece) {
        const letter: string = letters[piece.role] + ((piece.promoted && (letters[piece.role].charAt(0) !== '+')) ? '~' : '');
        return (piece.color === 'white') ? letter.toUpperCase() : letter;
      } else return '1';
    }).join('')
  ).join('/').replace(/1{2,}/g, s => s.length.toString());
}
