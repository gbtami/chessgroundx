import { State } from './state'
import { setCheck, setSelected } from './board'
import { read as fenRead } from './fen'
import { DrawShape, DrawBrush } from './draw'
import * as cg from './types'

export interface Config {
  fen?: cg.FEN; // chess position in Forsyth notation
  orientation?: cg.Color; // board orientation. white | black
  turnColor?: cg.Color; // turn to play. white | black
  check?: cg.Color | boolean; // true for current color, false to unset
  lastMove?: cg.Key[]; // squares part of the last move ["c3", "c4"]
  selected?: cg.Key; // square currently selected "a1"
  coordinates?: boolean; // include coords attributes
  autoCastle?: boolean; // immediately complete the castle by moving the rook after king move
  viewOnly?: boolean; // don't bind events: the user will never be able to move pieces around
  disableContextMenu?: boolean; // because who needs a context menu on a chessboard
  resizable?: boolean; // listens to chessground.resize on document.body to clear bounds cache
  addPieceZIndex?: boolean; // adds z-index values to pieces (for 3D)
  // pieceKey: boolean; // add a data-key attribute to piece elements
  highlight?: {
    lastMove?: boolean; // add last-move class to squares
    check?: boolean; // add check class to squares
  };
  animation?: {
    enabled?: boolean;
    duration?: number;
  };
  movable?: {
    free?: boolean; // all moves are valid - board editor
    color?: cg.Color | 'both'; // color that can move. white | black | both | undefined
    dests?: {
      [key: string]: cg.Key[]
    }; // valid moves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]}
    showDests?: boolean; // whether to add the move-dest class on squares
    events?: {
      after?: (orig: cg.Key, dest: cg.Key, metadata: cg.MoveMetadata) => void; // called after the move has been played
      afterNewPiece?: (role: cg.Role, key: cg.Key, metadata: cg.MoveMetadata) => void; // called after a new piece is dropped on the board
    };
    rookCastle?: boolean // castle by moving the king to the rook
  };
  premovable?: {
    enabled?: boolean; // allow premoves for color that can not move
    showDests?: boolean; // whether to add the premove-dest class on squares
    castle?: boolean; // whether to allow king castle premoves
    dests?: cg.Key[]; // premove destinations for the current selection
    events?: {
      set?: (orig: cg.Key, dest: cg.Key, metadata?: cg.SetPremoveMetadata) => void; // called after the premove has been set
      unset?: () => void;  // called after the premove has been unset
    }
  };
  predroppable?: {
    enabled?: boolean; // allow predrops for color that can not move
    showDropDests?: boolean;
    dropDests?: cg.Key[];
    current?: { // See corresponding type in state.ts for more comments
      role: cg.Role;
      key: cg.Key;
    };
    events?: {
      set?: (role: cg.Role, key: cg.Key) => void; // called after the predrop has been set
      unset?: () => void; // called after the predrop has been unset
    }
  };
  draggable?: {
    enabled?: boolean; // allow moves & premoves to use drag'n drop
    distance?: number; // minimum distance to initiate a drag; in pixels
    autoDistance?: boolean; // lets chessground set distance to zero when user drags pieces
    centerPiece?: boolean; // center the piece on cursor at drag start
    showGhost?: boolean; // show ghost of piece being dragged
    deleteOnDropOff?: boolean; // delete a piece when it is dropped off the board
  };
  selectable?: {
    // disable to enforce dragging over click-click move
    enabled?: boolean
  };
  events?: {
    change?: () => void; // called after the situation changes on the board
    // called after a piece has been moved.
    // capturedPiece is undefined or like {color: 'white'; 'role': 'queen'}
    move?: (orig: cg.Key, dest: cg.Key, capturedPiece?: cg.Piece) => void;
    dropNewPiece?: (piece: cg.Piece, key: cg.Key) => void;
    select?: (key: cg.Key) => void; // called when a square is selected
    insert?: (elements: cg.Elements) => void; // when the board DOM has been (re)inserted
  };
  dropmode?: {
    active?: boolean;
    piece?: cg.Piece;
    showDropDests?: boolean; // whether to add the move-dest class on squares for drops
    dropDests?: cg.DropDests; // see corresponding state.ts type for comments
    events?: {
      cancel?: () => void;// at least temporary - i need to refresh pocket on cancel of drop mode (mainly to clear the highlighting of the selected pocket piece) and pocket is currently outside chessgroundx so need to provide callback here
    }
  };
  drawable?: {
    enabled?: boolean; // can draw
    visible?: boolean; // can view
    eraseOnClick?: boolean;
    shapes?: DrawShape[];
    autoShapes?: DrawShape[];
    brushes?: DrawBrush[];
    pieces?: {
      baseUrl?: string;
    }
  };
  geometry?: cg.Geometry; // dim3x4 | dim5x5 | dim7x7 | dim8x8 | dim9x9 | dim10x8 | dim9x10 | dim10x10
  variant?: cg.Variant;
	chess960? : boolean;
  notation?: cg.Notation;
}

export function configure(state: State, config: Config) {

  // don't merge destinations. Just override.
  if (config.movable && config.movable.dests) state.movable.dests = undefined;
  if (config.dropmode?.dropDests) state.dropmode.dropDests = undefined;
  
  merge(state, config);

  if (config.geometry) state.dimensions = cg.dimensions[config.geometry];

  // if a fen was provided, replace the pieces
  if (config.fen) {
    const pieces = fenRead(config.fen);
    // prevent to cancel() already started piece drag from pocket!
    if (state.pieces['a0'] !== undefined) pieces['a0'] = state.pieces['a0'];
    state.pieces = pieces;
    state.drawable.shapes = [];
  }

  // apply config values that could be undefined yet meaningful
  if (config.hasOwnProperty('check')) setCheck(state, config.check || false);
  if (config.hasOwnProperty('lastMove') && !config.lastMove) state.lastMove = undefined;
  // in case of ZH drop last move, there's a single square.
  // if the previous last move had two squares,
  // the merge algorithm will incorrectly keep the second square.
  else if (config.lastMove) state.lastMove = config.lastMove;

  // fix move/premove dests
  if (state.selected) setSelected(state, state.selected);

  // no need for such short animations
  if (!state.animation.duration || state.animation.duration < 100) state.animation.enabled = false;

  if (!state.movable.rookCastle && state.movable.dests) {
    const rank = state.movable.color === 'white' ? 1 : 8,
    kingStartPos = 'e' + rank,
    dests = state.movable.dests[kingStartPos],
    king = state.pieces[kingStartPos];
    if (!dests || !king || king.role !== 'k-piece') return;
    state.movable.dests[kingStartPos] = dests.filter(d =>
      !((d === 'a' + rank) && dests.indexOf('c' + rank as cg.Key) !== -1) &&
        !((d === 'h' + rank) && dests.indexOf('g' + rank as cg.Key) !== -1)
    );
  }
};

function merge(base: any, extend: any) {
  for (let key in extend) {
    if (isObject(base[key]) && isObject(extend[key])) merge(base[key], extend[key]);
    else base[key] = extend[key];
  }
}

function isObject(o: any): boolean {
  return typeof o === 'object';
}
