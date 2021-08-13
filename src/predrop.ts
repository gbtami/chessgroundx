import * as util from './util'
import * as cg from './types'

export default function predrop(pieces: cg.Pieces, piece: cg.Piece, /*canCastle: boolean,*/ geom: cg.Geometry, variant: cg.Variant): cg.Key[] {

	switch (variant) {
		case 'crazyhouse':
			return predropCrazyhouse(piece);
		case 'shogi':
			return predropShogi(piece);
		case 'minishogi':
			return predropMiniShogi(piece);
		case 'gorogoro':
			return predropGorogo(piece);
		case 'kyotoshogi':
			return predropKyotoShogi();
		case 'dobutsu':
			return predropDobutsu();
		case 'grandhouse':
			return predropGrandhouse(piece);
		case 'shogun':
			return predropShogun(piece);
		case 'shouse':
			return predropSHouse(piece);
		case 'capahouse':
			return predropCapaHouse(piece);
		case 'gothhouse':
			return predropGothHouse(piece);
		case 'sittuyin':
			return predropSittuyin(pieces, piece);
		case 'placement':
			return predropPlacement(pieces, piece);
		case 'synochess':
			return predropSynochess();
		case 'shinobi':
			return predropShinobi();
		default:
			console.warn("Unknown variant:", variant);
			return util.allKeys(geom);
	}
}

/**
 * 8x8
 * everything everwhere except pawn cannot be dropped on 1st and last rank
 * */
function predropCrazyhouse(dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim8x8;

	return util.allKeys(geom).filter(key => {
		return role !== 'p-piece' ||
			!isLastRank(key, color, geom, 0) && !isFirstRank(key, color, geom, 0) ;
	});
}

/**
 * 9x9
 * - p and l cannot be dropped on last row (but can on first).
 * - n cannot also be dropped on second to last row either.
 * Everything else can be PREdropped everywhere
 * */
export function predropShogi(dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim9x9;

	return util.allKeys(geom).filter(key => {
		switch (role) {
			case "p-piece":
			case "l-piece":
				return !isLastRank(key, color, geom, 0);
			case "n-piece":
				return !isLastRank(key, color, geom, 0) && !isLastRank(key, color, geom, 1);
			default:
				return true;
		}
	});
}

/**
 * 5x5
 * p-piece cannot be dropped on last row
 */
export function predropMiniShogi(dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim5x5;
	return util.allKeys(geom).filter(key => {
		return (role === 'p-piece'/*'pawn'*/ ? !isLastRank(key, color, geom, 0) : true);
	});

}

/**
 * 5x6
 * p-piece cannot be dropped on last row (but can on first)
 * (Almost identical to minishogi except board size - still prefer to "repeat myself" for sake being more clear)
 */
export function predropGorogo( dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim5x6
	return util.allKeys(geom).filter(key => {
		return role === 'p-piece' ? !isLastRank(key, color, geom, 0) : true;
	});

}

/**
 * 5x5
 * Anything can be predropped anywhere
 */
export function predropKyotoShogi(): cg.Key[] {
	return util.allKeys(cg.Geometry.dim5x5);
}

/**
 * 3x4 (3 files)
 * no restrictions for dropping
 */
export function predropDobutsu(): cg.Key[] {
	return util.allKeys(cg.Geometry.dim3x4);
}


/**
 * 10x10
 * cannot drop pawns on 1st and last 3 ranks (8th to 10th)
 */
export function predropGrandhouse(dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim10x10;

	return util.allKeys(geom).filter(key => {
		return role === 'p-piece' ?
				 !isLastRank(key, color, geom, 0) &&
				 !isLastRank(key, color, geom, 1) &&
				 !isLastRank(key, color, geom, 2) &&
				 !isFirstRank(key, color, geom, 0) :
				 true;
	});
}

/**
 * 8x8
 * anything can be dropped anywhere except the last 3 ranks (aka the promotion zone). This also means pawns can be dropped on 1st rank.
 * */
export function predropShogun(dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const geom = cg.Geometry.dim8x8;

	return util.allKeys(geom).filter(key => {
		return (
			!isLastRank(key, color, geom, 0) &&
			!isLastRank(key, color, geom, 1) &&
			!isLastRank(key, color, geom, 2)
		);
	});
}

/**
 * 8x8
 * no drop of p-piece on first and last rank (like zh)
 */
function predropSHouse(dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim8x8;

	return util.allKeys(geom).filter(key => {
		return role === 'p-piece' ?
			!isLastRank(key, color, geom, 0) && !isFirstRank(key, color, geom, 0) :
			true;
	});
}

/**
 * 10x8
 * no drop of p-piece on first and last rank (like zh)
 */
function predropCapaHouse(dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim10x8;

	return util.allKeys(geom).filter(key => {
		return role === 'p-piece' ?
			!isLastRank(key, color, geom, 0) && !isFirstRank(key, color, geom, 0) :
			true;
	});
}

/**
 * TODO: i havent tested it - need to figure out how to enable it
 *       just copied same logic from predropCapaHouse - no idea if makes sense at all
 */
function predropGothHouse(dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim10x8;

	return util.allKeys(geom).filter(key => {
		return role === 'p-piece' ?
			!isLastRank(key, color, geom, 0) && !isFirstRank(key, color, geom, 0) :
			true;
	});
}

/**
 * 8x8
 * r-piece on first rank only as far as i can tell
 * rest of the pieces can be pre-dropped on any empty square first 2 ranks and right-most 4 squares of the 3d rank
 **/
function predropSittuyin(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {

	function isRightMostHalfRank(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			 "efgh".includes( key[0] ) :
			 "abcd".includes( key[0] ) ;
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const geom = cg.Geometry.dim8x8;

	return util.allKeys(geom).filter(key => {
		const p = pieces[key];
		return !p && // square should be empty - unlike other variants - here drop phase is in the beginning and separate
			         // from move phase that starts after all drops are made, so there is no way a square to be vacated
			(isFirstRank(key,color, geom, 0) /*for r-piece*/ ||
			   role !== 'r-piece' && (
					isFirstRank(key, color, geom, 0) ||
					isFirstRank(key, color, geom, 1) ||
					(isFirstRank(key, color, geom, 2) && isRightMostHalfRank(key, color)) )
			);
	});
}

/**
 * 8x8
 * all pieces can be pre-dropped on any empty square the first rank only
 * this means we can take into account non-empty squares and exclude them as possible dests
 */
function predropPlacement(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const geom = cg.Geometry.dim8x8;
	return util.allKeys(geom).filter(key => {
		const p = pieces[key];
		return (
			(!p) // square should be empty - unlike other variants - here drop phase is in the beginning and separate
			     // from move phase that starts after all drops are made, so there is no way a square to be vacated
			&&
			isFirstRank(key, color, geom, 0)
		);
	});
}

/**
 * 8x8
 * only on 5th rank
 */
function predropSynochess(): cg.Key[] {
	return util.allKeys(cg.Geometry.dim8x8).filter(key => {
		return key[1] === '5';
	});
}

/**
 * 8x8
 * Only on 1th-4th rank. That is exactly those numbers of ranks only for one of the sides. The other side can't drop
 */
function predropShinobi(): cg.Key[] {

	return util.allKeys(cg.Geometry.dim8x8).filter(key => {
		return (
			(key[1] === '1' || key[1] === '2' || key[1] === '3' || key[1] === '4')
		);
	});
}

// utils:

/**
 * @param idxBack	Should be zero to return true for LAST rank, 1 for next to last (penultimate) rank, etc.
 * */
function isLastRank(key: cg.Key, color: cg.Color, geom: cg.Geometry, idxBack: number): boolean {
	const highestRowIdx = cg.ranks[cg.dimensions[geom].height-1-idxBack];
	const lowestRowIdx = cg.ranks[0+idxBack];
	return color === /*'sente'*/'white' ? key[1] === highestRowIdx : key[1] === lowestRowIdx;
}

/**
 * @param idxBack	Should be zero to return true for FIRST rank, 1 for SECOND rank, etc.
 * */
function isFirstRank(key: cg.Key, color: cg.Color, geom: cg.Geometry, idx: number): boolean {
	const highestRowIdx = cg.ranks[cg.dimensions[geom].height-1-idx];
	const lowestRowIdx = cg.ranks[0+idx];
	return color === /*'sente'*/'white' ? key[1] === lowestRowIdx : key[1] === highestRowIdx;
}
