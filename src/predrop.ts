import * as util from './util'
import * as cg from './types'

export default function predrop(pieces: cg.Pieces, piece: cg.Piece, /*canCastle: boolean, geom: cg.Geometry,*/ variant: cg.Variant): cg.Key[] {
	console.log("predrop. variant=",variant," piece=",piece, "pieces=",pieces);
	//const geom = cg.dimensions[cg.Geometry.dim8x8];
	switch (variant) {
		case 'crazyhouse':
			return predropCrazyhouse(pieces, piece);
		case 'shogi':
			return predropShogi(pieces, piece);
		case 'minishogi':
			return predropMiniShogi(pieces, piece);
		case 'gorogoro':
			return predropGorogo(pieces, piece);
		case 'kyotoshogi':
			return predropKyotoShogi(pieces, piece);
		case 'dobutsu':
			return predropDobutsu(pieces, piece);
		case 'grandhouse':
			return predropGrandhouse(pieces, piece);
		case 'shogun':
			return predropShogun(pieces, piece);
		case 'shouse':
			return predropSHouse(pieces, piece);
		case 'capahouse':
			return predropCapaHouse(pieces, piece);
		case 'gothhouse':
			//10x8
			//cannot find it this anywhere - there is something called gothic starting position though in capahouse for example
			//see chess.ts -> disabledVariants
			return predropGothHouse(pieces, piece);
		case 'sittuyin':
			//8x8
			//r-piece on first rank only as far as i can tell - havent read it anywhere
			//rest pieces can be pre-dropped on any empty square first 2 ranks and right-most 4 squares of the 3d rank
			//this means we can take into account non-empty squares and exclude them as possible dests although maybe overkill
			return predropSittuyin(pieces, piece);
		case 'placement':
			//8x8
			//all pieces can be pre-dropped on any empty square the first rank only
			//this means we can take into account non-empty squares and exclude them as possible dests although maybe overkill
			return predropPlacement(pieces, piece);
		default:
			console.warn("Unknown variant:", variant);
			return util.allKeys(cg.Geometry.dim8x8);//TODO:get geomtry from param maybe
	}

	return util.allKeys(cg.Geometry.dim8x8)
}

function predropCrazyhouse(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function lastRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '8':
			key[1] === '1';
	}

	function firstRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '1':
			key[1] === '8';
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim8x8);

	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) /*TODO: this is not 100% right because of en passant - i.e a same color piece can be taken but without the square to end up occupied by opps piece - other variants that have en passant maybe have same issue - leaving it like this, because too ugly to highlight whole board somehow and too sophisticated to detect possible en passants and allow such pawns as dests*/
			&&
			(role === 'p-piece' ? !lastRow(key, color) && !firstRow(key, color) : true)
		);
	});
}

export function predropShogi(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {

	function lastRow(key: cg.Key, color: cg.Color): boolean {
		return color === /*'sente'*/'white' ? key[1] === '9' : key[1] === '1';
	}

	function lastTwoRows(key: cg.Key, color: cg.Color): boolean {
		return color === /*'sente'*/'white' ? key[1] === '8' || key[1] === '9' : key[1] === '1' || key[1] === '2';
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim9x9);
	return allk.filter(key => {
		const p = pieces[key];
		return (//TODO:i came up with l-piece and n-piece and n-piece names by guesswork - works for pawns it seems to me while testing but no idea if i guessed the other two piece names right
			(!p || p.color !== color) &&
				//p and l cannot be dropped on last row (but can on first). n cannot also be dropped on second to last row either.
			(role === 'p-piece'/*'pawn'*/ || role === 'l-piece'/*'lance'*/ ? !lastRow(key, color) : role === 'n-piece'/*'knight'*/ ? !lastTwoRows(key, color) : true)
		);
	});
}

/**
 * 5x5
 * p-piece cannot be dropped on last row
 */
export function predropMiniShogi(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function lastRow(key: cg.Key, color: cg.Color): boolean {
		return color === /*'sente'*/'white' ? key[1] === '5' : key[1] === '1';
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim5x5);
	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) &&
			//p cannot be dropped on last row (but can on first).
			(role === 'p-piece'/*'pawn'*/ ? !lastRow(key, color) : true)
		);
	});

}

/**
 * 5x6
 * p-piece cannot be dropped on last row
 * (Almost identical to minishogi except board size - still prefer to "repeat myself" for sake being more clear)
 */
export function predropGorogo(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function lastRow(key: cg.Key, color: cg.Color): boolean {
		return color === /*'sente'*/'white' ? key[1] === '6' : key[1] === '1';
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim5x6);
	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) &&
			//p cannot be dropped on last row (but can on first).
			(role === 'p-piece' ? !lastRow(key, color) : true)
		);
	});

}

/**
 * 5x5
 * Seems to me anything can be dropped anywhere (except as usual on own pieces)
 */
export function predropKyotoShogi(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim5x5);
	return allk.filter(key => {
		const p = pieces[key];
		return !p || p.color !== color;
	});;

}

/**
 * 3x4 (3 files)
 * no restrictions for dropping
 */
export function predropDobutsu(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {

	const color = dropPiece.color;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim3x4);
	return allk.filter(key => {
		const p = pieces[key];
		return !p || p.color !== color;
	});

}


/**
 * 10x10
 * cannot drop pawns on 1st and last 3 ranks (8th to 10th)
 */
export function predropGrandhouse(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function lastThreeRows(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '8' || key[1] === '9' || key[1] === ':'/*means 10*/ :
			key[1] === '1' || key[1] === '2' || key[1] === '3';
	}

	function firstRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '1':
			key[1] === ':'/*means 10*/;
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim10x10);

	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) /*TODO: this is not 100% right because of en passant - i.e a same color piece can be taken but without the square to end up occupied by opps piece - other variants that have en passant maybe have same issue - leaving it like this, because too ugly to highlight whole board somehow and too sophisticated to detect possible en passants and allow such pawns as dests*/
			&&
			(role === 'p-piece' ? !lastThreeRows(key, color) && !firstRow(key, color) : true)
		);
	});

}

/**
 * 8x8
 * anything can be dropped anywhere except the last 3 ranks (aka the promotion zone). This also means pawns can be dropped on 1st rank.
 * */
export function predropShogun(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function lastThreeRows(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '6' || key[1] === '7' || key[1] === '8':
			key[1] === '1' || key[1] === '2' || key[1] === '3';
	}

	const color = dropPiece.color;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim8x8);

	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) /*TODO: this is not 100% right because of en passant - i.e a same color piece can be taken but without the square to end up occupied by opps piece - other variants that have en passant maybe have same issue - leaving it like this, because too ugly to highlight whole board somehow and too sophisticated to detect possible en passants and allow such pawns as dests*/
			&&
			!lastThreeRows(key, color)
		);
	});

}


/**
 * 8x8
 * no drop of p-piece on first and last rank (like zh)
 */
function predropSHouse(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function lastRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '8':
			key[1] === '1';
	}

	function firstRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '1':
			key[1] === '8';
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim8x8);

	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) /*TODO: this is not 100% right because of en passant - i.e a same color piece can be taken but without the square to end up occupied by opps piece - other variants that have en passant maybe have same issue - leaving it like this, because too ugly to highlight whole board somehow and too sophisticated to detect possible en passants and allow such pawns as dests*/
			&&
			(role === 'p-piece' ? !lastRow(key, color) && !firstRow(key, color) : true)
		);
	});
}

/**
 * 10x8
 * no drop of p-piece on first and last rank (like zh)
 */
function predropCapaHouse(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function lastRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '8':
			key[1] === '1';
	}

	function firstRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '1':
			key[1] === '8';
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim10x8);

	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) /*TODO: this is not 100% right because of en passant - i.e a same color piece can be taken but without the square to end up occupied by opps piece - other variants that have en passant maybe have same issue - leaving it like this, because too ugly to highlight whole board somehow and too sophisticated to detect possible en passants and allow such pawns as dests*/
			&&
			(role === 'p-piece' ? !lastRow(key, color) && !firstRow(key, color) : true)
		);
	});
}


/**
 * 10x8
 * TODO: i havent tested it - need to figure out how to enable it
 *       just copied same logic from predropCapaHouse - no idea if makes sense at all
 */
function predropGothHouse(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function lastRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '8':
			key[1] === '1';
	}

	function firstRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '1':
			key[1] === '8';
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim10x8);

	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) /*TODO: this is not 100% right because of en passant - i.e a same color piece can be taken but without the square to end up occupied by opps piece - other variants that have en passant maybe have same issue - leaving it like this, because too ugly to highlight whole board somehow and too sophisticated to detect possible en passants and allow such pawns as dests*/
			&&
			(role === 'p-piece' ? !lastRow(key, color) && !firstRow(key, color) : true)
		);
	});
}


/**
 * 8x8
 * r-piece on first rank only as far as i can tell
 * rest pieces can be pre-dropped on any empty square first 2 ranks and right-most 4 squares of the 3d rank
 **/
function predropSittuyin(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {

	function firstRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '1':
			key[1] === '8';
	}

	function firstSecondRowOrThirdHalfRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '1' || key[1] === '2' || (key[1] === '3' && "efgh".includes( key[0] ) ):
			key[1] === '8' || key[1] === '7' || (key[1] === '6' && "abcd".includes( key[0] ) );
	}

	const color = dropPiece.color;
	const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim8x8);

	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) /*TODO: this is not 100% right because of en passant - i.e a same color piece can be taken but without the square to end up occupied by opps piece - other variants that have en passant maybe have same issue - leaving it like this, because too ugly to highlight whole board somehow and too sophisticated to detect possible en passants and allow such pawns as dests*/
			&&
			( firstRow(key,color) ||
				( role !== 'r-piece' && firstSecondRowOrThirdHalfRow(key, color) )
			)
		);
	});
}

/**
 * 8x8
 * all pieces can be pre-dropped on any empty square the first rank only
 * this means we can take into account non-empty squares and exclude them as possible dests although maybe overkill
 */
function predropPlacement(pieces: cg.Pieces, dropPiece: cg.Piece): cg.Key[] {
	function firstRow(key: cg.Key, color: cg.Color): boolean {
		return color === 'white' ?
			key[1] === '1' :
			key[1] === '8' ;
	}

	const color = dropPiece.color;
	// const role = dropPiece.role;
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim8x8);

	return allk.filter(key => {
		const p = pieces[key];
		return (
			(!p || p.color !== color) /*TODO: this is not 100% right because of en passant - i.e a same color piece can be taken but without the square to end up occupied by opps piece - other variants that have en passant maybe have same issue - leaving it like this, because too ugly to highlight whole board somehow and too sophisticated to detect possible en passants and allow such pawns as dests*/
			&&
			firstRow(key, color)
		);
	});
}
