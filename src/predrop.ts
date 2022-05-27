import * as util from './util';
import * as cg from './types';

type DropMobility = (x: number, y: number) => boolean;

const wholeBoard = () => true;

/**
 *
 * @param from	0-based index from given color's PoV, inclusive
 * @param to	0-based index from given color's PoV, exclusive
 * @param color The piece's color
 * @param geom  The board's geometry
 *
 * Returns a function that checks if a position's rank is inside the from-to range, where from and to are indices of rank when counting from
 * current "color"'s point of view (i.e. if from=to=1 and color=black the function will return true only if the position's rank is 8 in case of 8x8 board)
 * from and to can be zero or negative to denote that many ranks counting from the last
 *
 * */
function rankRange(from: number, to: number, color: cg.Color, bd: cg.BoardDimensions): DropMobility {
  if (from < 0) from += bd.height;
  if (to < 0) to += bd.height;
  return (_x, y) => {
    if (color === 'black') y = bd.height - 1 - y;
    return from <= y && y < to;
  };
}

export function predrop(pieces: cg.Pieces, piece: cg.Piece, bd: cg.BoardDimensions, variant: cg.Variant): cg.Key[] {
  const role = piece.role;
  const color = piece.color;

  // Pieces can be dropped anywhere on the board by default.
  // Mobility will be modified based on variant and piece to match the game rule.
  let mobility: DropMobility = wholeBoard;

  switch (variant) {
    case 'crazyhouse':
    case 'shouse':
    case 'capahouse':
    case 'gothhouse':
      switch (role) {
        case 'p-piece': // pawns can't be dropped on the first rank or last rank
          mobility = rankRange(1, -1, color, bd);
          break;
      }
      break;

    case 'placement':
      // the "drop" is the placement phase where pieces can only be placed on the first rank
      mobility = rankRange(0, 1, color, bd);
      break;

    case 'sittuyin':
      switch (role) {
        case 'r-piece': // rooks can only be placed on the first rank
          mobility = rankRange(0, 1, color, bd);
          break;
        default: // the "drop" is the placement phase where pieces can be placed on its player's half of the board
          mobility = rankRange(0, 3, color, bd);
      }
      break;

    case 'shogi':
    case 'minishogi':
    case 'gorogoro':
    case 'gorogoroplus':
      switch (role) {
        case 'p-piece': // pawns and lances can't be dropped on the last rank
        case 'l-piece':
          mobility = rankRange(0, -1, color, bd);
          break;
        case 'n-piece': // knights can't be dropped on the last two ranks
          mobility = rankRange(0, -2, color, bd);
          break;
      }
      break;

    // This code is unnecessary but is here anyway to be explicit
    case 'kyotoshogi':
    case 'dobutsu':
    case 'chennis':
      mobility = wholeBoard;
      break;

    case 'torishogi':
      switch (role) {
        case 's-piece': // swallows can't be dropped on the last rank
          mobility = rankRange(0, -1, color, bd);
          break;
      }
      break;

    case 'grandhouse':
      switch (role) {
        case 'p-piece': // pawns can't be dropped on the 1st, or 8th to 10th ranks
          mobility = rankRange(1, 7, color, bd);
          break;
      }
      break;

    case 'shogun':
      // shogun only permits drops on ranks 1-5 for all pieces
      mobility = rankRange(0, 5, color, bd);
      break;

    case 'synochess':
      // Only black can drop, and the only droppable rank is the literal rank five.
      mobility = (_x, y) => y === 4;
      break;

    case 'shinobi':
      // Only white can drop, and only on their own half of the board
      mobility = (_x, y) => y <= 3;
      break;

    default:
      console.warn('Unknown drop variant', variant);
  }

  return util
    .allPos(bd)
    .filter(pos => pieces.get(util.pos2key(pos))?.color !== color && mobility(pos[0], pos[1]))
    .map(util.pos2key);
}
