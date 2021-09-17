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
function rankRange(from: number, to: number, color: cg.Color, geom: cg.Geometry): DropMobility {
    const height = cg.dimensions[geom].height;
    if (from < 0) from += height;
    if (to < 0) to += height;
    return (_x, y) => {
        if (color === 'black') y = height - 1 - y;
        return from <= y && y < to;
    };
}

export function predrop(pieces: cg.Pieces, piece: cg.Piece, geom: cg.Geometry, variant: cg.Variant): cg.Key[] {
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
                case 'p-piece': mobility = rankRange(1, -1, color, geom); break; // pawns can't be dropped on the first rank or last rank
            }
			break;

		case 'placement':
            mobility = rankRange(0, 1, color, geom); // the "drop" is the placement phase where pieces can only be placed on the first rank
			break;

        case 'sittuyin':
            switch (role) {
                case 'r-piece': mobility = rankRange(0, 1, color, geom); break; // rooks can only be placed on the first rank
                default: mobility = (x, y) => { // the "drop" is the placement phase where pieces can be placed on its player's half of the board
                    const bd = cg.dimensions[geom];
                    if (color === 'black') {
                        x = bd.width - 1 - x;
                        y = bd.height - 1 - y;
                    }
                    return y < 2 || (x > 3 && y === 2);
                };
            }
            break;

		case 'shogi':
		case 'minishogi':
		case 'gorogoro':
            switch (role) {
                case 'p-piece': // pawns and lances can't be dropped on the last rank
                case 'l-piece': mobility = rankRange(0, -1, color, geom); break;
                case 'n-piece': mobility = rankRange(0, -2, color, geom); break;// knights can't be dropped on the last two ranks
            }
			break;

        // This code is unnecessary but is here anyway to be explicit
		case 'kyotoshogi':
		case 'dobutsu':
			mobility = wholeBoard;
			break;

        case 'torishogi':
            switch (role) {
                case 's-piece': mobility = rankRange(0, -1, color, geom); break; // swallows can't be dropped on the last rank
            }
            break;

		case 'grandhouse':
            switch (role) {
                case 'p-piece': mobility = rankRange(1, 7, color, geom); break; // pawns can't be dropped on the 1st, or 8th to 10th ranks
            }
			break;

		case 'shogun':
            mobility = rankRange(0, 5, color, geom); // shogun only permits drops on ranks 1-5 for all pieces
			break;

		case 'synochess':
            mobility = (_x, y) => y === 4; // Only black can drop, and the only droppable rank is the literal rank five.
			break;

		case 'shinobi':
            mobility = (_x, y) => y <= 3; // Only white can drop, and only on their own half of the board
			break;

		default:
			console.warn("Unknown drop variant", variant);
	}

	return util.allPos(geom)
        .filter(pos => pieces.get(util.pos2key(pos))?.color !== color && mobility(pos[0], pos[1]))
        .map(util.pos2key);
}
