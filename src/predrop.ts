import * as util from './util'
import * as cg from './types'

export default function predrop(role: cg.Role, /*canCastle: boolean, geom: cg.Geometry,*/ variant: cg.Variant): cg.Key[] {
	console.log("predrop. variant="+variant+" role="+role);
	//const geom = cg.dimensions[cg.Geometry.dim8x8];
	return util.allKeys(cg.Geometry.dim8x8);
}
