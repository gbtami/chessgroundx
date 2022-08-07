export type Color = typeof colors[number];
export type PieceSide = typeof pieceSides[number];
export type Letter = typeof letters[number];
export type PieceLetter = `${'' | '+'}${Letter | Uppercase<Letter>}`;
export type Role = `${'' | 'p'}${Letter}-piece`;
export type File = typeof files[number];
export type Rank = typeof ranks[number];
export type Key = `${File}${Rank}`;
export type DropOrig = `${PieceLetter}@`;
export type Orig = DropOrig | Key;

export type FEN = string;
export type Pos = [number, number];
export interface Piece {
  role: Role;
  color: Color;
  promoted?: boolean;
}
export interface Drop {
  role: Role;
  key: Key;
}
export type Pieces = Map<Key, Piece>;
export type PiecesDiff = Map<Key, Piece | undefined>;

export type PocketPosition = 'top' | 'bottom';
export type Pocket = Map<Role, number>;
export type Pockets = Record<Color, Pocket>;
export type PocketRoles = Record<Color, Role[]>;

export type BoardState = {
  pieces: Pieces;
  pockets?: Pockets;
};

export type Selectable = Key | Piece;

export type Move = [Selectable, Key];

export type NumberPair = [number, number];

export type NumberQuad = [number, number, number, number];

export interface BoardDimensions {
  width: number;
  height: number;
}

export const enum Notation {
  ALGEBRAIC,        // English letters on bottom, Arabic numbers on side
  SHOGI_ENGLET,     // Arabic numbers on top, English letters on side
  SHOGI_ARBNUM,     // Arabic numbers on top and side
  SHOGI_HANNUM,     // Arabic numbers on top, Kanji numbers on side
  JANGGI,           // Arabic numbers on bottom and side, with 0 denoting 10th rank
  XIANGQI_ARBNUM,   // Arabic numbers on top and bottom
  XIANGQI_HANNUM,   // Arabic numbers on top, Hanzi numbers on bottom
  THAI_ALGEBRAIC,   // Thai letters on bottom, Thai numbers on side
}

export type Premove = (boardState: BoardState, key: Key, canCastle: boolean) => Key[];
export type Predrop = (boardState: BoardState, piece: Piece) => Key[];

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Dests = Map<Orig, Key[]>;

export interface Elements {
  board: HTMLElement;
  pocketTop?: HTMLElement;
  pocketBottom?: HTMLElement;
  draggedPiece?: HTMLElement;
  wrap: HTMLElement;
  container: HTMLElement;
  ghost?: HTMLElement;
  svg?: SVGElement;
  customSvg?: SVGElement;
  autoPieces?: HTMLElement;
}
export interface Dom {
  elements: Elements;
  bounds: Memo<ClientRect>;
  redraw: () => void;
  redrawNow: (skipSvg?: boolean) => void;
  unbind?: Unbind;
  destroyed?: boolean;
}
export interface Exploding {
  stage: number;
  keys: readonly Key[];
}

export interface MoveMetadata {
  premove: boolean;
  ctrlKey?: boolean;
  holdTime?: number;
  captured?: Piece;
}
export interface SetPremoveMetadata {
  ctrlKey?: boolean;
}

export type MouchEvent = Event & Partial<MouseEvent & TouchEvent>;

export interface KeyedNode extends HTMLElement {
  cgKey: Key;
}
export interface PieceNode extends KeyedNode {
  tagName: 'PIECE';
  cgPiece: string;
  cgAnimating?: boolean;
  cgFading?: boolean;
  cgDragging?: boolean;
  cgScale?: number;
}
export interface SquareNode extends KeyedNode {
  tagName: 'SQUARE';
}

export interface Memo<A> {
  (): A;
  clear: () => void;
}

export interface Timer {
  start: () => void;
  cancel: () => void;
  stop: () => number;
}

export type Redraw = () => void;
export type Unbind = () => void;
export type Milliseconds = number;
export type KHz = number;

export type RanksPosition = 'left' | 'right';

export const colors = ['white', 'black'] as const;
export const pieceSides = ['ally', 'enemy'] as const;
export const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'] as const;
export const ranks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@'] as const;
export const letters = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
] as const;
