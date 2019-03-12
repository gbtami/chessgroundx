import * as util from './util'
import * as cg from './types'

type Mobility = (x1:number, y1:number, x2:number, y2:number) => boolean;

function diff(a: number, b:number):number {
  return Math.abs(a - b);
}

function pawn(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => diff(x1, x2) < 2 && (
    color === 'white' ? (
      // allow 2 squares from 1 and 8, for horde
      y2 === y1 + 1 || (y1 <= 2 && y2 === (y1 + 2) && x1 === x2)
    ) : (
      y2 === y1 - 1 || (y1 >= 7 && y2 === (y1 - 2) && x1 === x2)
    )
  );
}

const knight: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
}

const bishop: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) === diff(y1, y2);
}

const rook: Mobility = (x1, y1, x2, y2) => {
  return x1 === x2 || y1 === y2;
}

const queen: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
}

function king(color: cg.Color, rookFiles: number[], canCastle: boolean): Mobility {
  return (x1, y1, x2, y2)  => (
    diff(x1, x2) < 2 && diff(y1, y2) < 2
  ) || (
    canCastle && y1 === y2 && y1 === (color === 'white' ? 1 : 8) && (
      (x1 === 5 && (x2 === 3 || x2 === 7)) || util.containsX(rookFiles, x2)
    )
  );
}

// makruk/sittuyin queen
const met: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;
}

// capablanca archbishop, seirawan hawk
const archbishop: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
}

// capablanca cancellor, seirawan elephant
const cancellor: Mobility = (x1, y1, x2, y2) => {
  return rook(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
}

// shogi lance
function lance(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => (
    x2 === x1 && (color === 'white' ? y2 > y1 : y2 < y1)
  );
}

// shogi silver, makruk/sittuyin bishop
function silver(color: cg.Color): Mobility {
  return (x1, y1, x2, y2)  => (
    met(x1, y1, x2, y2) || (x1 === x2 && color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)
  );
}

// shogi gold, promoted pawn/knight/lance/silver
function gold(color: cg.Color): Mobility {
  return (x1, y1, x2, y2)  => (
    diff(x1, x2) < 2 && diff(y1, y2) < 2 && (
      color === 'white' ?
        !((x2 === x1 - 1 && y2 === y1 - 1) || (x2 === x1 + 1 && y2 === y1 - 1)) :
        !((x2 === x1 + 1 && y2 === y1 + 1) || (x2 === x1 - 1 && y2 === y1 + 1))
    )
  );
}

// shogi pawn
function spawn(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => (x2 === x1 && color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1);
}

// shogi knight
function sknight(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => color === 'white' ?
    (y2 === y1 + 2 && x2 === x1 - 1 || y2 === y1 + 2 && x2 === x1 + 1) :
    (y2 === y1 - 2 && x2 === x1 - 1 || y2 === y1 - 2 && x2 === x1 + 1);
}

// shogi promoted rook
const prook: Mobility = (x1, y1, x2, y2) => {
  return rook(x1, y1, x2, y2) || (diff(x1, x2) < 2 && diff(y1, y2) < 2);
}

// shogi promoted bishop
const pbishop: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || (diff(x1, x2) < 2 && diff(y1, y2) < 2);
}

// shogi king
const sking: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) < 2 && diff(y1, y2) < 2;
}

// xiangqi pawn
function xpawn(color: cg.Color): Mobility {
  // TODO: over the river they can move horizontaly also
  return (x1, y1, x2, y2) => (x2 === x1 && color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1);
}

// xiangqi bishop
const xbishop: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 2;
}

// xiangqi advisor
const advisor: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;
}

// xiangqi general(king)
const xking: Mobility = (x1, y1, x2, y2) => {
  // TODO: flying general can capture opp general
  return (x1 === x2 || y1 === y2) && diff(x1, x2) === 1;
}

function rookFilesOf(pieces: cg.Pieces, color: cg.Color, firstRankIs0: boolean) {
  return Object.keys(pieces).filter(key => {
    const piece = pieces[key];
    return piece && piece.color === color && piece.role === 'rook';
  }).map((key: string ) => util.key2pos(key as cg.Key, firstRankIs0)[0]);
}

export default function premove(pieces: cg.Pieces, key: cg.Key, canCastle: boolean, geom: cg.Geometry): cg.Key[] {
  const firstRankIs0 = cg.dimensions[geom].height === 10;
  const piece = pieces[key]!,
  pos = util.key2pos(key, firstRankIs0);
  let mobility: Mobility;
  // Piece premove depends on chess variant not on board geometry, but we will use it here
  // F.e. shogi is not the only 9x9 variant, see https://en.wikipedia.org/wiki/Jeson_Mor
  switch (geom) {
  case cg.Geometry.dim9x10:
    switch (piece.role) {
    case 'pawn':
      mobility = xpawn(piece.color);
      break;
    case 'cannon':
    case 'rook':
      mobility = rook;
      break;
    case 'knight':
      mobility = knight;
      break;
    case 'bishop':
      mobility = xbishop;
      break;
    case 'advisor':
      mobility = advisor;
      break;
    case 'king':
      mobility = xking;
      break;
    }
  case cg.Geometry.dim9x9:
    switch (piece.role) {
    case 'pawn':
      mobility = spawn(piece.color);
      break;
    case 'knight':
      mobility = sknight(piece.color);
      break;
    case 'bishop':
      mobility = bishop;
      break;
    case 'rook':
      mobility = rook;
      break;
    case 'king':
      mobility = sking;
      break;
    case 'silver':
      mobility = silver(piece.color);
      break;
    case 'ppawn':
    case 'plance':
    case 'pknight':
    case 'psilver':
    case 'gold':
      mobility = gold(piece.color);
      break;
    case 'lance':
      mobility = lance(piece.color);
      break;
    case 'prook':
      mobility = prook;
      break;
    case 'pbishop':
      mobility = pbishop;
      break;
    }
  default:
    switch (piece.role) {
    case 'pawn':
      mobility = pawn(piece.color);
      break;
    case 'knight':
      mobility = knight;
      break;
    case 'bishop':
      mobility = bishop;
      break;
    case 'rook':
      mobility = rook;
      break;
    case 'queen':
      mobility = queen;
      break;
    case 'king':
      mobility = king(piece.color, rookFilesOf(pieces, piece.color, firstRankIs0), canCastle);
      break;
    case 'hawk':
    case 'archbishop':
      mobility = archbishop;
      break;
    case 'elephant':
    case 'cancellor':
      mobility = cancellor;
      break;
    case 'met':
    case 'ferz':
      mobility = met;
      break;
    case 'silver':
      mobility = silver(piece.color);
      break;
    };
  };
  const allkeys = util.allKeys[geom];

  const pos2keyGeom = (geom: cg.Geometry) => ( (pos: cg.Pos) => util.pos2key(pos, geom) );
  const pos2key = pos2keyGeom(geom);

  const key2posRank0 = (firstrank0: boolean) => ( (key: cg.Key) => util.key2pos(key, firstrank0) );
  const key2pos = key2posRank0(firstRankIs0);

  return allkeys.map(key2pos).filter(pos2 => {
    return (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]);
  }).map(pos2key);
};
