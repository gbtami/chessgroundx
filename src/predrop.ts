import * as util from './util'
import * as cg from './types'

export default function predrop(pieces: cg.Pieces, piece: cg.Piece, geom: cg.Geometry, variant: cg.Variant): cg.Key[] {

	const color = piece.color;
	const role = piece.role;

	let mobility: (key : cg.Key) => boolean;

	switch (variant) {
		case 'crazyhouse':
			mobility = key => {
				return role !== 'p-piece' || (
					!rankRange(key, cg.dimensions[geom].height, cg.dimensions[geom].height, color, geom) &&
					!rankRange(key, 1, 1, color, geom) ) ;
			};
			break;
		case 'shogi':
			mobility = key => {
				switch (role) {
					case "p-piece":
					case "l-piece":
						return !rankRange(key, cg.dimensions[geom].height, cg.dimensions[geom].height, color, geom);
					case "n-piece":
						return !rankRange(key, cg.dimensions[geom].height-1, cg.dimensions[geom].height, color, geom);
					default:
						return true;
				}
			};
			break;
		case 'minishogi':
			mobility = key => {
				return (role === 'p-piece'/*'pawn'*/ ? !rankRange(key, cg.dimensions[geom].height, cg.dimensions[geom].height, color, geom) : true);
			};
			break;
		case 'gorogoro':
			mobility = key => {
				return role === 'p-piece' ? !rankRange(key, cg.dimensions[geom].height, cg.dimensions[geom].height, color, geom) : true;
			};
			break;
		case 'kyotoshogi':
			mobility = () => { return true };
			break;
		case 'dobutsu':
			mobility = () => { return true };
			break;
		case 'grandhouse':
			mobility = key => {
				return role === 'p-piece' ?
					!rankRange(key, cg.dimensions[geom].height-2, cg.dimensions[geom].height, color, geom) &&
					!rankRange(key, 1, 1, color, geom) :
					true;
			};
			break;
		case 'shogun':
			mobility = key => {
				return !rankRange(key, cg.dimensions[geom].height-2, cg.dimensions[geom].height, color, geom);
			};
			break;
		case 'shouse':
		case 'capahouse':
		case 'gothhouse':
			mobility = key => {
				return role === 'p-piece' ?
					!rankRange(key, cg.dimensions[geom].height, cg.dimensions[geom].height, color, geom) &&
					!rankRange(key, 1, 1, color, geom) :
					true;
			};
			break;
		case 'sittuyin':
			mobility = key => {

				function isRightMostHalfRank(key: cg.Key, color: cg.Color): boolean {
					return color === 'white' ?
						"efgh".includes( key[0] ) :
						"abcd".includes( key[0] ) ;
				}

				const p = pieces[key];
				return !p && // square should be empty - unlike other variants - here drop phase is in the beginning and separate
					         // from move phase that starts after all drops are made, so there is no way a square to be vacated
					(rankRange(key, 1, 1, color, geom) /*for r-piece*/ ||
						role !== 'r-piece' && (
							rankRange(key, 1, 2, color, geom) ||
							(rankRange(key, 3, 3, color, geom) && isRightMostHalfRank(key, color)) )
					);
			};
			break;
		case 'placement':
			mobility = key => {
				const p = pieces[key];
				return (
					(!p) // square should be empty - unlike other variants - here drop phase is in the beginning and separate
					     // from move phase that starts after all drops are made, so there is no way a square to be vacated
					&& rankRange(key, 1, 1, color, geom)
				);
			};
			break;
		case 'synochess': // only on rank number 5 - only one side can drop like shinobi
			mobility = key => {
				return key[1] === '5';
			};
			break;
		case 'shinobi': // Only on ranks with numbers 1 - 4. That is exactly those numbers of ranks only for one of the sides. The other side can't drop
			mobility = key => {
				return (
					(key[1] === '1' || key[1] === '2' || key[1] === '3' || key[1] === '4')
				);
			};
			break;
		default:
			console.warn("Unknown variant:", variant);
			mobility = () => { return true };
	}

	return util.allKeys(geom).filter(mobility);

}

/**
 *
 * @param key
 * @param from	1-based index from given color's PoV
 * @param to	1-based index from given color's PoV
 * @param color
 * @param geom
 *
 * checks if key's rank is inside the from-to range, where from and to are not coordinates of ranks but index of rank when counting from
 * current "color"'s point of view (i.e. if from=to=1 and color=black we will return true only if key's rank is 8 in case of 8x8 board)
 *
 * from should be <= to
 * */
function rankRange(key: cg.Key, from: number, to: number, color: cg.Color, geom: cg.Geometry): boolean {
	if (color == 'white') {
		return key[1] >= cg.ranks[from-1] && key[1] <= cg.ranks[to-1];
	} else {
		// when we want 3rd rank from black's POV (i.e. from=3) that is actually 8 - 3 + 1 = 6th rank in normal notation
		const blackPOVfrom = cg.dimensions[geom].height - from;
		const blackPOVto = cg.dimensions[geom].height - to;
		// assert blackPOVto >= blackPOVfrom, so swapping places in below expression
		return key[1] >= cg.ranks[blackPOVto] && key[1] <= cg.ranks[blackPOVfrom];
	}
}