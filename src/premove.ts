import * as util from './util.js';
import * as cg from './types.js';

type Mobility = (x1: number, y1: number, x2: number, y2: number) => boolean;

const diff = (a: number, b: number): number => Math.abs(a - b);

const pawn =
  (color: cg.Color): Mobility =>
  (x1, y1, x2, y2) =>
    diff(x1, x2) < 2 &&
    (color === 'white'
      ? // allow 2 squares from first two ranks, for horde
        y2 === y1 + 1 || (y1 <= 1 && y2 === y1 + 2 && x1 === x2)
      : y2 === y1 - 1 || (y1 >= 6 && y2 === y1 - 2 && x1 === x2));

export const knight: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
};

const bishop: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) === diff(y1, y2);
};

const rook: Mobility = (x1, y1, x2, y2) => {
  return x1 === x2 || y1 === y2;
};

export const queen: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
};

const king =
  (color: cg.Color, rookFiles: number[], canCastle: boolean): Mobility =>
  (x1, y1, x2, y2) =>
    (diff(x1, x2) < 2 && diff(y1, y2) < 2) ||
    (canCastle &&
      y1 === y2 &&
      y1 === (color === 'white' ? 0 : 7) &&
      ((x1 === 4 && ((x2 === 2 && rookFiles.includes(0)) || (x2 === 6 && rookFiles.includes(7)))) ||
        rookFiles.includes(x2)));

function rookFilesOf(pieces: cg.Pieces, color: cg.Color) {
  const backrank = color === 'white' ? '1' : '8';
  const files = [];
  for (const [key, piece] of pieces) {
    if (key[1] === backrank && piece.color === color && piece.role === 'r-piece') {
      files.push(util.key2pos(key)[0]);
    }
  }
  return files;
}

/* TODO add and make use of these

function and(m1: Mobility, m2: Mobility): Mobility {
    return (x1, y1, x2, y2) => m1(x1, y1, x2, y2) && m2(x1, y1, x2, y2);
}

function or(m1: Mobility, m2: Mobility): Mobility {
    return (x1, y1, x2, y2) => m1(x1, y1, x2, y2) || m2(x1, y1, x2, y2);
}

function not(m: Mobility): Mobility {
    return (x1, y1, x2, y2) => !m(x1, y1, x2, y2);
}

*/

function backrank(color: cg.Color): number {
  return color === 'white' ? 0 : 7;
}

// king without castling
const kingNoCastling: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) < 2 && diff(y1, y2) < 2;
};

// 960 king (can only castle with king takes rook)
function king960(color: cg.Color, rookFiles: number[], canCastle: boolean): Mobility {
  return (x1, y1, x2, y2) =>
    kingNoCastling(x1, y1, x2, y2) || (canCastle && y1 === y2 && y1 === backrank(color) && rookFiles.includes(x2));
}

// capablanca king (different castling files from standard chess king)
function kingCapa(color: cg.Color, rookFiles: number[], canCastle: boolean): Mobility {
  return (x1, y1, x2, y2) =>
    kingNoCastling(x1, y1, x2, y2) ||
    (canCastle &&
      y1 === y2 &&
      y1 === backrank(color) &&
      x1 === 5 &&
      ((x2 === 8 && rookFiles.includes(9)) || (x2 === 2 && rookFiles.includes(0))));
}

// shako king (different castling files and ranks from standard chess king)
function kingShako(color: cg.Color, rookFiles: number[], canCastle: boolean): Mobility {
  return (x1, y1, x2, y2) =>
    kingNoCastling(x1, y1, x2, y2) ||
    (canCastle &&
      y1 === y2 &&
      y1 === (color === 'white' ? 1 : 8) &&
      x1 === 5 &&
      ((x2 === 7 && rookFiles.includes(8)) || (x2 === 3 && rookFiles.includes(1))));
}
function rookFilesOfShako(pieces: cg.Pieces, color: cg.Color) {
  const backrank = color === 'white' ? '2' : '9';
  const files = [];
  for (const [key, piece] of pieces) {
    if (key[1] === backrank && piece.color === color && piece.role === 'r-piece') {
      files.push(util.key2pos(key)[0]);
    }
  }
  return files;
}

function pawnNoDoubleStep(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => diff(x1, x2) < 2 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1);
}

// grand pawn (10x10 board, can move two squares on third row)
function pawnGrand(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) =>
    diff(x1, x2) < 2 &&
    (color === 'white'
      ? y2 === y1 + 1 || (y1 <= 2 && y2 === y1 + 2 && x1 === x2)
      : y2 === y1 - 1 || (y1 >= 7 && y2 === y1 - 2 && x1 === x2));
}

// wazir
const wazir: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === 1 && yd === 0) || (xd === 0 && yd === 1);
};

// ferz, met
const ferz: Mobility = (x1, y1, x2, y2) => diff(x1, x2) === diff(y1, y2) && diff(x1, x2) === 1;

// shatranj elephant
const elephant: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return xd === yd && xd === 2;
};

// archbishop (knight + bishop)
const archbishop: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};

// chancellor (knight + rook)
const chancellor: Mobility = (x1, y1, x2, y2) => {
  return rook(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};

// amazon (knight + queen)
const amazon: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};

// shogun general (knight + king)
const centaur: Mobility = (x1, y1, x2, y2) => {
  return kingNoCastling(x1, y1, x2, y2) || knight(x1, y1, x2, y2);
};

// shogi lance
function shogiLance(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => x2 === x1 && (color === 'white' ? y2 > y1 : y2 < y1);
}

// shogi silver, makruk khon, sittuyin elephant
function shogiSilver(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => ferz(x1, y1, x2, y2) || (x1 === x2 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1));
}

// shogi gold, promoted pawn/knight/lance/silver
function shogiGold(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) =>
    wazir(x1, y1, x2, y2) || (diff(x1, x2) < 2 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1));
}

// shogi pawn
function shogiPawn(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1);
}

// shogi knight
function shogiKnight(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => (x2 === x1 - 1 || x2 === x1 + 1) && (color === 'white' ? y2 === y1 + 2 : y2 === y1 - 2);
}

// shogi promoted rook (dragon king)
const shogiDragon: Mobility = (x1, y1, x2, y2) => {
  return rook(x1, y1, x2, y2) || ferz(x1, y1, x2, y2);
};

// shogi promoted bishop (dragon horse)
const shogiHorse: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || wazir(x1, y1, x2, y2);
};

// Define xiangqi palace based on geometry
// The palace is the 3x3 squares in the middle files at each side's end of the board
type Palace = cg.Pos[];

function _palace(bd: cg.BoardDimensions, color: cg.Color): Palace {
  const middleFile = Math.floor(bd.width / 2);
  const startingRank = color === 'white' ? 0 : bd.height - 3;

  return [
    [middleFile - 1, startingRank + 2],
    [middleFile, startingRank + 2],
    [middleFile + 1, startingRank + 2],
    [middleFile - 1, startingRank + 1],
    [middleFile, startingRank + 1],
    [middleFile + 1, startingRank + 1],
    [middleFile - 1, startingRank],
    [middleFile, startingRank],
    [middleFile + 1, startingRank],
  ];
}

function memoizePalace(): (bd: cg.BoardDimensions, color: cg.Color) => Palace {
  const cache: Record<string, Palace> = {};
  return (bd: cg.BoardDimensions, color: cg.Color) => {
    const key = `${bd.width}x${bd.height}${color.slice(0, 1)}`;
    if (!(key in cache)) cache[key] = _palace(bd, color);
    return cache[key];
  };
}

const palace = memoizePalace();

// xiangqi pawn
function xiangqiPawn(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) =>
    (x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)) ||
    (y2 === y1 && diff(x1, x2) < 2 && (color === 'white' ? y1 > 4 : y1 < 5));
}

// minixiangqi pawn
function minixiangqiPawn(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) =>
    (x2 === x1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1)) || (y2 === y1 && diff(x1, x2) < 2);
}

// xiangqi elephant
function xiangqiElephant(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => elephant(x1, y1, x2, y2) && (color === 'white' ? y2 < 5 : y2 > 4);
}

// xiangqi advisor
function xiangqiAdvisor(color: cg.Color, bd: cg.BoardDimensions): Mobility {
  const p = palace(bd, color);
  return (x1, y1, x2, y2) => ferz(x1, y1, x2, y2) && p.some(point => point[0] === x2 && point[1] === y2);
}

// xiangqi general (king)
function xiangqiKing(color: cg.Color, bd: cg.BoardDimensions): Mobility {
  const p = palace(bd, color);
  return (x1, y1, x2, y2) => wazir(x1, y1, x2, y2) && p.some(point => point[0] === x2 && point[1] === y2);
}

// shako elephant
const shakoElephant: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) === diff(y1, y2) && diff(x1, x2) < 3;
};

// janggi elephant
export const janggiElephant: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === 2 && yd === 3) || (xd === 3 && yd === 2);
};

// janggi pawn
function janggiPawn(color: cg.Color, bd: cg.BoardDimensions): Mobility {
  const oppPalace = palace(bd, util.opposite(color));
  return (x1, y1, x2, y2) => {
    const palacePos = oppPalace.findIndex(point => point[0] === x1 && point[1] === y1);
    let additionalMobility: Mobility;
    switch (palacePos) {
      case 0:
        additionalMobility = (x1, y1, x2, y2) => x2 === x1 + 1 && color === 'black' && y2 === y1 - 1;
        break;
      case 2:
        additionalMobility = (x1, y1, x2, y2) => x2 === x1 - 1 && color === 'black' && y2 === y1 - 1;
        break;
      case 4:
        additionalMobility = (x1, y1, x2, y2) =>
          diff(x1, x2) === 1 && (color === 'white' ? y2 === y1 + 1 : y2 === y1 - 1);
        break;
      case 6:
        additionalMobility = (x1, y1, x2, y2) => x2 === x1 + 1 && color === 'white' && y2 === y1 + 1;
        break;
      case 8:
        additionalMobility = (x1, y1, x2, y2) => x2 === x1 - 1 && color === 'white' && y2 === y1 + 1;
        break;
      default:
        additionalMobility = () => false;
    }
    return minixiangqiPawn(color)(x1, y1, x2, y2) || additionalMobility(x1, y1, x2, y2);
  };
}

// janggi rook
function janggiRook(bd: cg.BoardDimensions): Mobility {
  const wPalace = palace(bd, 'white');
  const bPalace = palace(bd, 'black');
  return (x1, y1, x2, y2) => {
    let additionalMobility: Mobility;
    const wPalacePos = wPalace.findIndex(point => point[0] === x1 && point[1] === y1);
    const bPalacePos = bPalace.findIndex(point => point[0] === x1 && point[1] === y1);
    const palacePos = wPalacePos !== -1 ? wPalacePos : bPalacePos;
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    switch (palacePos) {
      case 0:
        additionalMobility = (x1, y1, x2, y2) => xd === yd && x2 > x1 && x2 <= x1 + 2 && y2 < y1 && y2 >= y1 - 2;
        break;
      case 2:
        additionalMobility = (x1, y1, x2, y2) => xd === yd && x2 < x1 && x2 >= x1 - 2 && y2 < y1 && y2 >= y1 - 2;
        break;
      case 4:
        additionalMobility = ferz;
        break;
      case 6:
        additionalMobility = (x1, y1, x2, y2) => xd === yd && x2 > x1 && x2 <= x1 + 2 && y2 > y1 && y2 <= y1 + 2;
        break;
      case 8:
        additionalMobility = (x1, y1, x2, y2) => xd === yd && x2 < x1 && x2 >= x1 - 2 && y2 > y1 && y2 <= y1 + 2;
        break;
      default:
        additionalMobility = () => false;
    }
    return rook(x1, y1, x2, y2) || additionalMobility(x1, y1, x2, y2);
  };
}

// janggi general (king)
function janggiKing(color: cg.Color, bd: cg.BoardDimensions): Mobility {
  const ownPalace = palace(bd, color);
  return (x1, y1, x2, y2) => {
    const palacePos = ownPalace.findIndex(point => point[0] === x1 && point[1] === y1);
    let additionalMobility: Mobility;
    switch (palacePos) {
      case 0:
        additionalMobility = (x1, y1, x2, y2) => x2 === x1 + 1 && y2 === y1 - 1;
        break;
      case 2:
        additionalMobility = (x1, y1, x2, y2) => x2 === x1 - 1 && y2 === y1 - 1;
        break;
      case 4:
        additionalMobility = ferz;
        break;
      case 6:
        additionalMobility = (x1, y1, x2, y2) => x2 === x1 + 1 && y2 === y1 + 1;
        break;
      case 8:
        additionalMobility = (x1, y1, x2, y2) => x2 === x1 - 1 && y2 === y1 + 1;
        break;
      default:
        additionalMobility = () => false;
    }
    return (
      (wazir(x1, y1, x2, y2) || additionalMobility(x1, y1, x2, y2)) &&
      ownPalace.some(point => point[0] === x2 && point[1] === y2)
    );
  };
}

// musketeer leopard
const musketeerLeopard: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === 1 || xd === 2) && (yd === 1 || yd === 2);
};
// musketeer hawk
const musketeerHawk: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (
    (xd === 0 && (yd === 2 || yd === 3)) ||
    (yd === 0 && (xd === 2 || xd === 3)) ||
    (xd === yd && (xd === 2 || xd === 3))
  );
};
// musketeer elephant
const musketeerElephant: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return xd === 1 || yd === 1 || (xd === 2 && (yd === 0 || yd === 2)) || (xd === 0 && yd === 2);
};
// musketeer cannon
const musketeerCannon: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return xd < 3 && (yd < 2 || (yd === 2 && xd === 0));
};
// musketeer unicorn
const musketeerUnicorn: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return knight(x1, y1, x2, y2) || (xd === 1 && yd === 3) || (xd === 3 && yd === 1);
};
// musketeer dragon
const musketeerDragon: Mobility = (x1, y1, x2, y2) => {
  return knight(x1, y1, x2, y2) || queen(x1, y1, x2, y2);
};
// musketeer fortress
const musketeerFortress: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === yd && xd < 4) || (yd === 0 && xd === 2) || (yd === 2 && xd < 2);
};
// musketeer spider
const musketeerSpider: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return xd < 3 && yd < 3 && !(xd === 1 && yd === 0) && !(xd === 0 && yd === 1);
};

// tori shogi goose (promoted swallow)
function toriGoose(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    return color === 'white'
      ? (xd === 2 && y2 === y1 + 2) || (xd === 0 && y2 === y1 - 2)
      : (xd === 2 && y2 === y1 - 2) || (xd === 0 && y2 === y1 + 2);
  };
}

// tori shogi left quail
function toriLeftQuail(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return color === 'white'
      ? (x2 === x1 && y2 > y1) || (xd === yd && x2 > x1 && y2 < y1) || (x2 === x1 - 1 && y2 === y1 - 1)
      : (x2 === x1 && y2 < y1) || (xd === yd && x2 < x1 && y2 > y1) || (x2 === x1 + 1 && y2 === y1 + 1);
  };
}

// tori shogi right quail
function toriRightQuail(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return color === 'white'
      ? (x2 === x1 && y2 > y1) || (xd === yd && x2 < x1 && y2 < y1) || (x2 === x1 + 1 && y2 === y1 - 1)
      : (x2 === x1 && y2 < y1) || (xd === yd && x2 > x1 && y2 > y1) || (x2 === x1 - 1 && y2 === y1 + 1);
  };
}

// tori shogi pheasant
function toriPheasant(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    return color === 'white'
      ? (x2 === x1 && y2 === y1 + 2) || (xd === 1 && y2 === y1 - 1)
      : (x2 === x1 && y2 === y1 - 2) || (xd === 1 && y2 === y1 + 1);
  };
}

// tori shogi crane
const toriCrane: Mobility = (x1, y1, x2, y2) => {
  return kingNoCastling(x1, y1, x2, y2) && y2 !== y1;
};

// tori shogi falcon
function toriFalcon(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => {
    return color === 'white'
      ? kingNoCastling(x1, y1, x2, y2) && !(x2 === x1 && y2 === y1 - 1)
      : kingNoCastling(x1, y1, x2, y2) && !(x2 === x1 && y2 === y1 + 1);
  };
}

// tori shogi eagle (promoted falcon)
function toriEagle(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return color === 'white'
      ? kingNoCastling(x1, y1, x2, y2) || (xd === yd && (y2 > y1 || (y2 < y1 && yd <= 2))) || (x2 === x1 && y2 < y1)
      : kingNoCastling(x1, y1, x2, y2) || (xd === yd && (y2 < y1 || (y2 > y1 && yd <= 2))) || (x2 === x1 && y2 > y1);
  };
}

// chak pawn
function pawnChak(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    return color === 'white' ? y2 >= y1 && y2 - y1 <= 1 && xd <= 1 : y1 >= y2 && y1 - y2 <= 1 && xd <= 1;
  };
}

// chak warrior
function chakWarrior(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => toriCrane(x1, y1, x2, y2) && (color === 'white' ? y2 >= 4 : y2 <= 4);
}

// chak divine king
function chakDivineKing(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return queen(x1, y1, x2, y2) && xd <= 2 && yd <= 2 && (color === 'white' ? y2 >= 4 : y2 <= 4);
  };
}

// chennis king
function kingChennis(color: cg.Color): Mobility {
  return (x1, y1, x2, y2) =>
    kingNoCastling(x1, y1, x2, y2) && x2 >= 1 && x2 <= 5 && (color === 'white' ? y2 <= 3 : y2 >= 3);
}

export function premove(
  pieces: cg.Pieces,
  key: cg.Key,
  canCastle: boolean,
  bd: cg.BoardDimensions,
  variant: cg.Variant,
  chess960: boolean
): cg.Key[] {
  const piece = pieces.get(key)!;
  const role = piece.role;
  const color = piece.color;
  const pos = util.key2pos(key);
  let mobility: Mobility = () => false;

  switch (variant) {
    case 'xiangqi':
    case 'manchu':
      switch (role) {
        case 'p-piece':
          mobility = xiangqiPawn(color);
          break; // pawn
        case 'c-piece': // cannon
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // horse
        case 'b-piece':
          mobility = xiangqiElephant(color);
          break; // elephant
        case 'a-piece':
          mobility = xiangqiAdvisor(color, bd);
          break; // advisor
        case 'k-piece':
          mobility = xiangqiKing(color, bd);
          break; // king
        case 'm-piece':
          mobility = chancellor;
          break; // banner
      }
      break;

    case 'janggi':
      switch (piece.role) {
        case 'p-piece':
          mobility = janggiPawn(color, bd);
          break; // pawn
        case 'c-piece': // cannon
        case 'r-piece':
          mobility = janggiRook(bd);
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // horse
        case 'b-piece':
          mobility = janggiElephant;
          break; // elephant
        case 'a-piece': // advisor
        case 'k-piece':
          mobility = janggiKing(color, bd);
          break; // king
      }
      break;

    case 'minixiangqi':
      {
        switch (piece.role) {
          case 'p-piece':
            mobility = minixiangqiPawn(color);
            break; // pawn
          case 'c-piece': // cannon
          case 'r-piece':
            mobility = rook;
            break; // rook
          case 'n-piece':
            mobility = knight;
            break; // horse
          case 'k-piece':
            mobility = xiangqiKing(color, bd);
            break; // king
        }
      }
      break;

    case 'shogi':
    case 'minishogi':
    case 'gorogoro':
    case 'gorogoroplus':
      switch (piece.role) {
        case 'p-piece':
          mobility = shogiPawn(color);
          break; // pawn
        case 'l-piece':
          mobility = shogiLance(color);
          break; // lance
        case 'n-piece':
          mobility = shogiKnight(color);
          break; // knight
        case 'k-piece':
          mobility = kingNoCastling;
          break; // king
        case 's-piece':
          mobility = shogiSilver(color);
          break; // silver
        case 'pp-piece': // tokin
        case 'pl-piece': // promoted lance
        case 'pn-piece': // promoted knight
        case 'ps-piece': // promoted silver
        case 'g-piece':
          mobility = shogiGold(color);
          break; // gold
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'pr-piece':
          mobility = shogiDragon;
          break; // dragon
        case 'pb-piece':
          mobility = shogiHorse;
          break; // horse
      }
      break;

    case 'kyotoshogi':
      switch (piece.role) {
        case 'l-piece':
          mobility = shogiLance(color);
          break; // kyoto - lance-tokin
        case 'pl-piece':
          mobility = shogiGold(color);
          break;
        case 's-piece':
          mobility = shogiSilver(color);
          break; // ginkaku - silver-bishop
        case 'ps-piece':
          mobility = bishop;
          break;
        case 'n-piece':
          mobility = shogiKnight(color);
          break; // kinkei - gold-knight
        case 'pn-piece':
          mobility = shogiGold(color);
          break;
        case 'p-piece':
          mobility = shogiPawn(color);
          break; // hifu - rook-pawn
        case 'pp-piece':
          mobility = rook;
          break;
        case 'k-piece':
          mobility = kingNoCastling;
          break; // king
      }
      break;

    case 'dobutsu':
      switch (piece.role) {
        case 'c-piece':
          mobility = shogiPawn(color);
          break; // chick
        case 'e-piece':
          mobility = ferz;
          break; // elephant
        case 'g-piece':
          mobility = wazir;
          break; // giraffe
        case 'l-piece':
          mobility = kingNoCastling;
          break; // lion
        case 'pc-piece':
          mobility = shogiGold(color);
          break; // hen
      }
      break;

    case 'torishogi':
      switch (role) {
        case 's-piece':
          mobility = shogiPawn(color);
          break; // swallow
        case 'ps-piece':
          mobility = toriGoose(color);
          break; // goose
        case 'l-piece':
          mobility = toriLeftQuail(color);
          break; // left quail
        case 'r-piece':
          mobility = toriRightQuail(color);
          break; // right quail
        case 'p-piece':
          mobility = toriPheasant(color);
          break; // pheasant
        case 'c-piece':
          mobility = toriCrane;
          break; // crane
        case 'f-piece':
          mobility = toriFalcon(color);
          break; // falcon
        case 'pf-piece':
          mobility = toriEagle(color);
          break; // eagle
        case 'k-piece':
          mobility = kingNoCastling;
          break; // phoenix
      }
      break;

    case 'makruk':
    case 'makpong':
    case 'sittuyin':
    case 'cambodian':
    case 'asean':
      switch (role) {
        case 'p-piece':
          mobility = pawnNoDoubleStep(color);
          break; // pawn
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece': // ASEAN bishop
        case 's-piece':
          mobility = shogiSilver(color);
          break; // khon
        case 'q-piece': // ASEAN queen
        case 'f-piece': // Sittuyin ferz
        case 'm-piece':
          mobility = ferz;
          break; // met
        case 'k-piece':
          mobility = kingNoCastling;
          break; // king
      }
      break;

    case 'grand':
    case 'grandhouse':
      switch (role) {
        case 'p-piece':
          mobility = pawnGrand(color);
          break; // pawn
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'c-piece':
          mobility = chancellor;
          break; // chancellor
        case 'a-piece':
          mobility = archbishop;
          break; // archbishop
        case 'k-piece':
          mobility = kingNoCastling;
          break; // king
      }
      break;

    case 'shako':
      switch (role) {
        case 'p-piece':
          mobility = pawnGrand(color);
          break; // pawn
        case 'c-piece': // cannon
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'e-piece':
          mobility = shakoElephant;
          break; // elephant
        case 'k-piece':
          mobility = kingShako(color, rookFilesOfShako(pieces, color), canCastle);
          break; // king
      }
      break;

    case 'shogun':
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 'pp-piece':
          mobility = kingNoCastling;
          break; // captain
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'pr-piece':
          mobility = chancellor;
          break; // mortar
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'pn-piece':
          mobility = centaur;
          break; // general
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'pb-piece':
          mobility = archbishop;
          break; // archbishop
        case 'f-piece':
          mobility = ferz;
          break; // duchess
        case 'pf-piece':
          mobility = queen;
          break; // queen
        case 'k-piece':
          mobility = king(color, rookFilesOf(pieces, color), canCastle);
          break; // king
      }
      break;

    case 'orda':
    case 'ordamirror':
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'l-piece':
          mobility = chancellor;
          break; // lancer
        case 'h-piece':
          mobility = centaur;
          break; // kheshig
        case 'a-piece':
          mobility = archbishop;
          break; // archer
        case 'y-piece':
          mobility = shogiSilver(color);
          break; // yurt
        case 'f-piece':
          mobility = amazon;
          break; // falcon
        case 'k-piece':
          mobility = king(color, rookFilesOf(pieces, color), canCastle);
          break; // king
      }
      break;

    case 'synochess':
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 'c-piece': // cannon
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 's-piece':
          mobility = minixiangqiPawn(color);
          break; // soldier
        case 'e-piece':
          mobility = shakoElephant;
          break; // elephant
        case 'a-piece':
          mobility = kingNoCastling;
          break; // advisor
        case 'k-piece':
          mobility = king(color, rookFilesOf(pieces, color), canCastle && color === 'white');
          break; // king
      }
      break;

    case 'musketeer':
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'l-piece':
          mobility = musketeerLeopard;
          break; // leopard
        case 'o-piece':
          mobility = musketeerCannon;
          break; // cannon
        case 'u-piece':
          mobility = musketeerUnicorn;
          break; // unicorn
        case 'd-piece':
          mobility = musketeerDragon;
          break; // dragon
        case 'c-piece':
          mobility = chancellor;
          break; // chancellor
        case 'a-piece':
          mobility = archbishop;
          break; // archbishop
        case 'e-piece':
          mobility = musketeerElephant;
          break; // elephant
        case 'h-piece':
          mobility = musketeerHawk; // hawk
          break;
        case 'f-piece':
          mobility = musketeerFortress; // fortress
          break;
        case 's-piece':
          mobility = musketeerSpider; // spider
          break;
        case 'k-piece':
          mobility = king(color, rookFilesOf(pieces, color), canCastle);
          break; // king
      }
      break;

    case 'hoppelpoppel':
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece': // knight (takes like bishop)
        case 'b-piece':
          mobility = archbishop;
          break; // bishop (takes like knight)
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'k-piece':
          mobility = king(color, rookFilesOf(pieces, color), canCastle);
          break; // king
      }
      break;

    case 'shinobi':
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 'pl-piece':
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'ph-piece':
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'pm-piece':
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'pp-piece':
        case 'c-piece':
          mobility = kingNoCastling;
          break; // captain
        case 'l-piece':
          mobility = shogiLance(color);
          break; // lance
        case 'h-piece':
          mobility = shogiKnight(color);
          break; // horse
        case 'm-piece':
          mobility = ferz;
          break; // monk
        case 'd-piece':
          mobility = shogiDragon;
          break; // dragon
        case 'j-piece':
          mobility = archbishop;
          break; // ninja
        case 'k-piece':
          mobility = king(color, rookFilesOf(pieces, color), canCastle);
          break; // king
      }
      break;

    case 'empire':
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 's-piece':
          mobility = minixiangqiPawn(color);
          break; // soldier
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'd-piece': // duke
        case 't-piece': // tower
        case 'c-piece': // cardinal
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'e-piece':
          mobility = amazon;
          break; // aegle
        case 'k-piece':
          mobility = king(color, rookFilesOf(pieces, color), canCastle);
          break; // king
      }
      break;

    case 'chak':
      switch (role) {
        case 'p-piece': // pawn
          mobility = pawnChak(color);
          break;
        case 'pp-piece': // warrior
          mobility = chakWarrior(color);
          break;
        case 'r-piece': // serpent
          mobility = rook;
          break;
        case 'v-piece': // vulture
          mobility = knight;
          break;
        case 's-piece': // shaman
          mobility = toriCrane;
          break;
        case 'j-piece': // jaguar
          mobility = centaur;
          break;
        case 'q-piece': // quetzal
          mobility = queen;
          break;
        case 'o-piece': // offering
          mobility = () => false;
          break;
        case 'k-piece': // king
          mobility = kingNoCastling;
          break;
        case 'pk-piece': // divine king
          mobility = chakDivineKing(color);
          break;
      }
      break;

    case 'chennis':
      switch (role) {
        case 'p-piece': // pawn
          mobility = pawnNoDoubleStep(color);
          break;
        case 'pp-piece': // rook
          mobility = rook;
          break;
        case 's-piece': // soldier
          mobility = minixiangqiPawn(color);
          break;
        case 'ps-piece': // bishop
          mobility = bishop;
          break;
        case 'f-piece': // ferz
          mobility = ferz;
          break;
        case 'pf-piece': // cannon
          mobility = rook;
          break;
        case 'm-piece': // mann
          mobility = kingNoCastling;
          break;
        case 'pm-piece': // knight
          mobility = knight;
          break;
        case 'k-piece': // king
          mobility = kingChennis(color);
          break;
      }
      break;

    case 'capablanca':
    case 'capahouse':
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'c-piece':
          mobility = chancellor;
          break; // chancellor
        case 'a-piece':
          mobility = archbishop;
          break; // archbishop
        case 'k-piece':
          mobility = chess960
            ? king960(color, rookFilesOf(pieces, color), canCastle)
            : kingCapa(color, rookFilesOf(pieces, color), canCastle);
          break; // king
      }
      break;

    // Variants using standard pieces and additional fairy pieces like S-chess, Capablanca, etc.
    default:
      switch (role) {
        case 'p-piece':
          mobility = pawn(color);
          break; // pawn
        case 'r-piece':
          mobility = rook;
          break; // rook
        case 'n-piece':
          mobility = knight;
          break; // knight
        case 'b-piece':
          mobility = bishop;
          break; // bishop
        case 'q-piece':
          mobility = queen;
          break; // queen
        case 'e-piece': // S-chess elephant
        case 'c-piece':
          mobility = chancellor;
          break; // chancellor
        case 'h-piece': // S-chess hawk
        case 'a-piece':
          mobility = archbishop;
          break; // archbishop
        case 'k-piece':
          mobility = chess960
            ? king960(color, rookFilesOf(pieces, color), canCastle)
            : king(color, rookFilesOf(pieces, color), canCastle);
          break; // king
      }
  }

  return util
    .allPos(bd)
    .filter(pos2 => (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]))
    .map(util.pos2key);
}
