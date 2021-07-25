import * as util from './util'
import * as cg from './types'

export default function predrop(pieces: cg.Pieces, piece: cg.Piece, /*canCastle: boolean, geom: cg.Geometry,*/ variant: cg.Variant): cg.Key[] {
	console.log("predrop. variant=",variant," piece=",piece, "pieces=",pieces);
	//const geom = cg.dimensions[cg.Geometry.dim8x8];
	switch (variant) {
		case 'crazyhouse':
			return predropCrazyhouse(piece);
		case 'xiangqi':
		case 'manchu':
			break;

		case 'janggi':
			break;

		case 'minixiangqi':
			break;

		case 'shogi':
		case 'minishogi':
		case 'gorogoro':
			return predropShogi(pieces, piece);//TODO:is it really valid for minishogi and gorogo? board sizes?

		case 'kyotoshogi':
			break;

		case 'dobutsu':
			break;

		case 'makruk':
		case 'makpong':
		case 'sittuyin':
		case 'cambodian':
			break;

		case 'grand':
		case 'grandhouse':
			break;

		case 'shako':
			break;

		case 'shogun':
			break;

		case 'orda':
			break;

		case 'synochess':
			break;

		case 'musketeer':
			break;

		case 'hoppelpoppel':
			break;

		case 'shinobi':
			break;

		// Variants using standard pieces and additional fairy pieces like S-chess, Capablanca, etc.
		default:
			console.warn("Unknown variant:", variant);
			return util.allKeys(cg.Geometry.dim8x8);
	}

	return util.allKeys(cg.Geometry.dim8x8)
}

function predropCrazyhouse(piece: cg.Piece): cg.Key[] {
	if (piece.role=="p-piece") {
		return Array.prototype.concat(...cg.files.slice(0, 8).map(c => cg.ranks.slice(1, 7).map(r => c+r)))
	} else {
		return util.allKeys(cg.Geometry.dim8x8);
	}
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
	const allk : cg.Key[] = util.allKeys(cg.Geometry.dim9x9);//TODO:probably minishogi and that other thing that call this function need changes here and other places
	return allk.filter(key => {
		const p = pieces[key];
		return (//TODO:i came up with l-piece and n-piece and n-piece names by guesswork - works for pawns it seems to me while testing but no idea if i guessed the other two piece names right
			(!p || p.color !== color) &&
			(role === 'p-piece'/*'pawn'*/ || role === 'l-piece'/*'lance'*/ ? !lastRow(key, color) : role === 'n-piece'/*'knight'*/ ? !lastTwoRows(key, color) : true)
		);
	});
}