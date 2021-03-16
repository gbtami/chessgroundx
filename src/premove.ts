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
      (x1 === 5 && ((util.containsX(rookFiles, 1) && x2 === 3) || (util.containsX(rookFiles, 8) && x2 === 7))) ||
      util.containsX(rookFiles, x2)
    )
  );
}

function rookFilesOf(pieces: cg.Pieces, color: cg.Color) {
  const backrank = color == 'white' ? '1' : '8';
  return Object.keys(pieces).filter(key => {
    const piece = pieces[key];
    return key[1] === backrank && piece && piece.color === color && piece.role === 'r-piece';
  }).map((key: string ) => util.key2pos(key as cg.Key)[0]);
}

// king without castling
const noCastlingKing: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) < 2 && diff(y1, y2) < 2;
}

// wazir
const wazir: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === 1 && yd === 0) || (xd === 0 && yd === 1);
}

// ferz, met
const ferz: Mobility = (x1, y1, x2, y2) => diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;

// shatranj elephant
const elephant: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return xd === yd && xd === 2;
}

// archbishop (knight + bishop)
const archbishop: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
}

// chancellor (knight + rook)
const chancellor: Mobility = (x1, y1, x2, y2) => {
  return rook(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
}

// shogun general (knight + king)
const centaur: Mobility = (x1, y1, x2, y2) => {
  return noCastlingKing(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
}

// shogi lance
function shogiLance(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => (
    x2 === x1 && (color === 'white' ? y2 > y1 : y2 < y1)
  );
}

// shogi silver, makruk khon, sittuyin elephant
function shogiSilver(color: cg.Color): Mobility {
  return (x1, y1, x2, y2)  => (
    ferz(x1, y1, x2, y2) || (x1 === x2 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1))
  );
}

// shogi gold, promoted pawn/knight/lance/silver
function shogiGold(color: cg.Color): Mobility {
  return (x1, y1, x2, y2)  => (
    wazir(x1, y1, x2, y2) || (diff(x1, x2) < 2 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1))
  );
}

// shogi pawn
function shogiPawn(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => (x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1));
}

// shogi knight
function shogiKnight(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => (x2 === x1 - 1 || x2 === x1 + 1) &&
    (color === 'white' ? (y2 === y1 + 2) : (y2 === y1 - 2));
}

// shogi promoted rook (dragon king)
const shogiDragon: Mobility = (x1, y1, x2, y2) => {
  return rook(x1, y1, x2, y2) || ferz(x1, y1, x2, y2);
}

// shogi promoted bishop (dragon horse)
const shogiHorse: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || wazir(x1, y1, x2, y2);
}

// Define xiangqi palace based on geometry
// The palace is the 3x3 squares in the middle files at each side's end of the board
type Palace = cg.Pos[];

function palace(geom: cg.Geometry, color: cg.Color): Palace {
  const bd = cg.dimensions[geom];
  const middleFile = Math.floor((bd.width + 1) / 2);
  const startingRank = (color === "white") ? 1 : bd.height - 2;

  return [
    [middleFile - 1, startingRank + 2], [middleFile, startingRank + 2], [middleFile + 1, startingRank + 2],
    [middleFile - 1, startingRank + 1], [middleFile, startingRank + 1], [middleFile + 1, startingRank + 1],
    [middleFile - 1, startingRank],     [middleFile, startingRank],     [middleFile + 1, startingRank],
  ];
}

const palaces: { [geom in cg.Geometry]? : { [color in cg.Color]: Palace } } = {
  [cg.Geometry.dim9x10]: {
    white: palace(cg.Geometry.dim9x10, "white"),
    black: palace(cg.Geometry.dim9x10, "black"),
  },
  [cg.Geometry.dim7x7]: {
    white: palace(cg.Geometry.dim7x7, "white"),
    black: palace(cg.Geometry.dim7x7, "black"),
  },
};

// xiangqi pawn
function xiangqiPawn(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => (
    (x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)) ||
    (y2 === y1 && diff(x1, x2) < 2 && (color === 'white' ? y1 > 5 : y1 < 6))
    );
}

// minixiangqi pawn
function minixiangqiPawn(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => (
    (x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)) ||
    (y2 === y1 && diff(x1, x2) < 2)
    );
}

// xiangqi elephant
function xiangqiElephant(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => elephant(x1, y1, x2, y2) && (color === 'white' ? y2 < 6 : y2 > 5)
}

// xiangqi advisor
function xiangqiAdvisor(color: cg.Color, geom: cg.Geometry): Mobility {
    const palace = palaces[geom]![color];
    return (x1, y1, x2, y2) => ferz(x1, y1, x2, y2) && palace.some(point => (point[0] === x2 && point[1] === y2))
}

// xiangqi general (king)
function xiangqiKing(color: cg.Color, geom: cg.Geometry): Mobility {
    const palace = palaces[geom]![color];
    return (x1, y1, x2, y2) => wazir(x1, y1, x2, y2) && palace.some(point => (point[0] === x2 && point[1] === y2));
}

// shako elephant
const shakoElephant: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) === diff(y1, y2) && (diff(x1, x2) < 3);
}

// janggi elephant
const janggiElephant: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === 2 && yd === 3) || (xd === 3 && yd === 2);
}

// janggi pawn
function janggiPawn(color: cg.Color): Mobility {
  // TODO add diagonal movement in palace
  return (x1, y1, x2, y2) => (
    (x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)) ||
    (y2 === y1 && diff(x1, x2) < 2)
  );
}

// janggi rook
// TODO add diagonal movement in palace
const janggiRook: Mobility = (x1, y1, x2, y2) => rook(x1, y1, x2, y2);

// janggi general (king)
// TODO correct diagonal movement in palace
function janggiKing(color: cg.Color, geom: cg.Geometry): Mobility {
  const palace = palaces[geom]![color];
  return (x1, y1, x2, y2) => (
    noCastlingKing(x1, y1, x2, y2) && palace.some(point => (point[0] === x2 && point[1] === y2))
  );
}

// musketeer leopard
const musketeerLeopard: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2); const yd = diff(y1, y2);
  return (
    (xd === 1 || xd === 2)
    && (yd === 1 || yd === 2)
  );
}
// musketeer hawk
const musketeerHawk: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2); const yd = diff(y1, y2);
  return (
    (xd === 0 && (yd === 2 || yd === 3))
    || (yd === 0 && (xd === 2 || xd === 3))
    || (xd === yd && (xd === 2 || xd === 3))
  );
}
// musketeer elephant
const musketeerElephant: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2); const yd = diff(y1, y2);
  return (
    xd === 1 || yd === 1
    || (xd === 2 && (yd === 0 || yd === 2))
    || (xd === 0 && yd === 2)
  );
}
// musketeer cannon
const musketeerCannon: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2); const yd = diff(y1, y2);
  return (
    (xd < 3)
    && ((yd < 2) || (yd === 2 && xd === 0))
  );
}
// musketeer unicorn
const musketeerUnicorn: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2); const yd = diff(y1, y2);
  return knight(x1, y1, x2, y2) || (xd === 1 && yd === 3) || (xd === 3 && yd === 1);
}
// musketeer dragon
const musketeerDragon: Mobility = (x1, y1, x2, y2) => {
  return knight(x1, y1, x2, y2) || queen(x1, y1, x2, y2);
}
// musketeer fortress
const musketeerFortress: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2); const yd = diff(y1, y2);
  return (
    (xd === yd && xd < 4)
    || (yd === 0 && xd === 2)
    || (yd === 2 && xd < 2) 
  );
}
// musketeer spider
const musketeerSpider: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2); const yd = diff(y1, y2);
  return (
    xd < 3 && yd < 3
    && !(xd === 1 && yd === 0)
    && !(xd === 0 && yd === 1)
  );
}

export default function premove(pieces: cg.Pieces, key: cg.Key, canCastle: boolean, geom: cg.Geometry, variant: cg.Variant): cg.Key[] {
  const piece = pieces[key]!,
  pos = util.key2pos(key);
  let mobility: Mobility;

  switch (variant) {

    case 'xiangqi':
    case 'manchu':
      switch (piece.role) {
        case 'p-piece': mobility = xiangqiPawn(piece.color); break; // pawn
        case 'c-piece': // cannon
        case 'r-piece': mobility = rook; break; // rook
        case 'n-piece': mobility = knight; break; // horse
        case 'b-piece': mobility = xiangqiElephant(piece.color); break; // elephant
        case 'a-piece': mobility = xiangqiAdvisor(piece.color, geom); break; // advisor
        case 'k-piece': mobility = xiangqiKing(piece.color, geom); break; // king
        case 'm-piece': mobility = chancellor; break; // banner
      }
      break;

    case 'janggi':
      switch (piece.role) {
        case 'p-piece': mobility = janggiPawn(piece.color); break; // pawn
        case 'c-piece': // cannon
        case 'r-piece': mobility = janggiRook; break; // rook
        case 'n-piece': mobility = knight; break; // horse
        case 'b-piece': mobility = janggiElephant; break; // elephant
        case 'a-piece': // advisor
        case 'k-piece': mobility = janggiKing(piece.color, geom); break; // king
      }
      break;

    case 'minixiangqi': {
      switch (piece.role) {
        case 'p-piece': mobility = minixiangqiPawn(piece.color); break; // pawn
        case 'c-piece': // cannon
        case 'r-piece': mobility = rook; break; // rook
        case 'n-piece': mobility = knight; break; // horse
        case 'k-piece': mobility = xiangqiKing(piece.color, geom); break; // king
      }
    }
    break;

  case 'shogi':
  case 'minishogi':
  case 'gorogoro':
    switch (piece.role) {
      case 'p-piece': mobility = shogiPawn(piece.color); break; // pawn
      case 'l-piece': mobility = shogiLance(piece.color); break; // lance
      case 'n-piece': mobility = shogiKnight(piece.color); break; // knight
      case 'k-piece': mobility = noCastlingKing; break; // king
      case 's-piece': mobility = shogiSilver(piece.color); break; // silver
      case 'pp-piece': // tokin
      case 'pl-piece': // promoted lance
      case 'pn-piece': // promoted knight
      case 'ps-piece': // promoted silver
      case 'g-piece': mobility = shogiGold(piece.color); break; // gold
      case 'b-piece': mobility = bishop; break; // bishop
      case 'r-piece': mobility = rook; break; // rook
      case 'pr-piece': mobility = shogiDragon; break; // dragon
      case 'pb-piece': mobility = shogiHorse; break; // horse
    };
    break;

  case 'kyotoshogi':
    switch (piece.role) {
      case 'l-piece': mobility = shogiLance(piece.color); break; // kyoto - lance-tokin
      case 'pl-piece': mobility = shogiGold(piece.color); break;
      case 's-piece': mobility = shogiSilver(piece.color); break; // ginkaku - silver-bishop
      case 'ps-piece': mobility = bishop; break;
      case 'n-piece': mobility = shogiKnight(piece.color); break; // kinkei - gold-knight
      case 'pn-piece': mobility = shogiGold(piece.color); break;
      case 'p-piece': mobility = shogiPawn(piece.color); break; // hifu - rook-pawn
      case 'pp-piece': mobility = rook; break;
      case 'k-piece': mobility = noCastlingKing; break; // king
    };
    break;

  case 'dobutsu':
    switch (piece.role) {
      case 'c-piece': mobility = shogiPawn(piece.color); break; // chick
      case 'e-piece': mobility = ferz; break; // elephant
      case 'g-piece': mobility = wazir; break; // giraffe
      case 'l-piece': mobility = noCastlingKing; break; // lion
      case 'pc-piece': mobility = shogiGold(piece.color); break; // hen
    }
    break;

  case 'makruk':
  case 'makpong':
  case 'sittuyin':
  case 'cambodian':
    switch (piece.role) {
      case 'p-piece': mobility = pawn(piece.color); break; // pawn
      case 'r-piece': mobility = rook; break; // rook
      case 'n-piece': mobility = knight; break; // knight
      case 's-piece': mobility = shogiSilver(piece.color); break; // khon
      case 'f-piece': // Sittuyin ferz
      case 'm-piece': mobility = ferz; break; // met
      case 'k-piece': mobility = noCastlingKing; break; // king
    }
    break;

  case 'shako':
    switch (piece.role) {
      case 'p-piece': mobility = pawn(piece.color); break; // pawn
      case 'c-piece': // cannon
      case 'r-piece': mobility = rook; break; // rook
      case 'n-piece': mobility = knight; break; // knight
      case 'b-piece': mobility = bishop; break; // bishop
      case 'q-piece': mobility = queen; break; // queen
      case 'e-piece': mobility = shakoElephant; break; // elephant
      case 'k-piece': mobility = king(piece.color, rookFilesOf(pieces, piece.color), canCastle); break; // king
    }
    break;

  case 'shogun':
    switch (piece.role) {
      case 'p-piece': mobility = pawn(piece.color); break; // pawn
      case 'pp-piece': mobility = noCastlingKing; break; // captain
      case 'r-piece': mobility = rook; break; // rook
      case 'pr-piece': mobility = chancellor; break; // mortar
      case 'n-piece': mobility = knight; break; // knight
      case 'pn-piece': mobility = centaur; break; // general
      case 'b-piece': mobility = bishop; break; // bishop
      case 'pb-piece': mobility = archbishop; break;// archbishop
      case 'f-piece': mobility = ferz; break; // duchess
      case 'pf-piece': mobility = queen; break; // queen
      case 'k-piece': mobility = king(piece.color, rookFilesOf(pieces, piece.color), canCastle); break; // king
    }
    break;

  case 'orda':
    switch (piece.role) {
      case 'p-piece': mobility = pawn(piece.color); break; // pawn
      case 'r-piece': mobility = rook; break; // rook
      case 'n-piece': mobility = knight; break; // knight
      case 'b-piece': mobility = bishop; break; // bishop
      case 'q-piece': mobility = queen; break; // queen
      case 'l-piece': mobility = chancellor; break; // lancer
      case 'h-piece': mobility = centaur; break; // kheshig
      case 'a-piece': mobility = archbishop; break; // archer
      case 'y-piece': mobility = shogiSilver(piece.color); break; // yurt
      case 'k-piece': mobility = king(piece.color, rookFilesOf(pieces, piece.color), canCastle); break; // king
    }
    break;

  case 'synochess':
    switch (piece.role) {
      case 'p-piece': mobility = pawn(piece.color); break; // pawn
      case 'c-piece': // cannon
      case 'r-piece': mobility = rook; break; // rook
      case 'n-piece': mobility = knight; break; // knight
      case 'b-piece': mobility = bishop; break; // bishop
      case 'q-piece': mobility = queen; break; // queen
      case 's-piece': mobility = janggiPawn(piece.color); break; // soldier
      case 'e-piece': mobility = shakoElephant; break; // elephant
      case 'a-piece': mobility = noCastlingKing; break; // advisor
      case 'k-piece': mobility = king(piece.color, rookFilesOf(pieces, piece.color), canCastle); break; // king
    }
    break;

  case 'musketeer':
    switch (piece.role) {
      case 'p-piece': mobility = pawn(piece.color); break; // pawn
      case 'r-piece': mobility = rook; break; // rook
      case 'n-piece': mobility = knight; break; // knight
      case 'b-piece': mobility = bishop; break; // bishop
      case 'q-piece': mobility = queen; break; // queen
      case 'l-piece': mobility = musketeerLeopard; break; // leopard
      case 'o-piece': mobility = musketeerCannon; break; // cannon
      case 'u-piece': mobility = musketeerUnicorn; break; // unicorn
      case 'd-piece': mobility = musketeerDragon; break; // dragon
      case 'c-piece': mobility = chancellor; break; // chancellor
      case 'a-piece': mobility = archbishop; break; // archbishop
      case 'e-piece': mobility = musketeerElephant; break; // elephant
      case 'h-piece': mobility = musketeerHawk; // hawk
      case 'f-piece': mobility = musketeerFortress; // fortress
      case 's-piece': mobility = musketeerSpider; // spider
      case 'k-piece': mobility = king(piece.color, rookFilesOf(pieces, piece.color), canCastle); break; // king
    }
    break;

  case 'hoppelpoppel':
    switch (piece.role) {
      case 'p-piece': mobility = pawn(piece.color); break; // pawn
      case 'r-piece': mobility = rook; break; // rook
      case 'n-piece': // knight (takes like bishop)
      case 'b-piece': mobility = archbishop; break; // bishop (takes like knight)
      case 'q-piece': mobility = queen; break; // queen
      case 'k-piece': mobility = king(piece.color, rookFilesOf(pieces, piece.color), canCastle); break; // king
    }
    break;

  // Variants using standard pieces and additional fairy pieces like S-chess, Capablanca, etc.
  default:
    switch (piece.role) {
      case 'p-piece': mobility = pawn(piece.color); break; // pawn
      case 'r-piece': mobility = rook; break; // rook
      case 'n-piece': mobility = knight; break; // knight
      case 'b-piece': mobility = bishop; break; // bishop
      case 'q-piece': mobility = queen; break; // queen
      case 'e-piece': // S-chess elephant
      case 'c-piece': mobility = chancellor; break; // chancellor
      case 'h-piece': // S-chess hawk
      case 'a-piece': mobility = archbishop; break; // archbishop
      case 'k-piece': mobility = king(piece.color, rookFilesOf(pieces, piece.color), canCastle); break; // king
    }

  }

  return util.allKeys(geom).map(util.key2pos).filter(pos2 => {
    return (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]);
  }).map(util.pos2key);
}
