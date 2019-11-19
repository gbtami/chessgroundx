import * as cg from './types';

export const colors: cg.Color[] = ['white', 'black'];

export const NRanks: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const invNRanks: number[] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

const files5 = cg.files.slice(0, 5);
const files7 = cg.files.slice(0, 7);
const files8 = cg.files.slice(0, 8);
const files9 = cg.files.slice(0, 9);
const files10 = cg.files.slice(0, 10);

const ranks5 = cg.ranks.slice(1, 6);
const ranks7 = cg.ranks.slice(1, 8);
const ranks8 = cg.ranks.slice(1, 9);
const ranks9 = cg.ranks.slice(1, 10);
// we have to count ranks starting from 0 as in UCCI
const ranks10 = cg.ranks.slice(0, 10);

const allKeys5x5: cg.Key[] = Array.prototype.concat(...files5.map(c => ranks5.map(r => c+r)));
const allKeys7x7: cg.Key[] = Array.prototype.concat(...files7.map(c => ranks7.map(r => c+r)));
const allKeys8x8: cg.Key[] = Array.prototype.concat(...files8.map(c => ranks8.map(r => c+r)));
const allKeys9x9: cg.Key[] = Array.prototype.concat(...files9.map(c => ranks9.map(r => c+r)));
const allKeys10x8: cg.Key[] = Array.prototype.concat(...files10.map(c => ranks8.map(r => c+r)));
const allKeys9x10: cg.Key[] = Array.prototype.concat(...files9.map(c => ranks10.map(r => c+r)));
const allKeys10x10: cg.Key[] = Array.prototype.concat(...files10.map(c => ranks10.map(r => c+r)));

export const allKeys = [allKeys8x8, allKeys9x9, allKeys10x8, allKeys9x10, allKeys10x10, allKeys5x5, allKeys7x7];

export function pos2key(pos: cg.Pos, geom: cg.Geometry) {
    const bd = cg.dimensions[geom];
    return allKeys[geom][bd.height * pos[0] + pos[1] - bd.height - 1];
}

export function key2pos(k: cg.Key, firstRankIs0: boolean) {
  const shift = firstRankIs0 ? 1 : 0;
  return [k.charCodeAt(0) - 96, k.charCodeAt(1) - 48 + shift] as cg.Pos;
}

export function memo<A>(f: () => A): cg.Memo<A> {
  let v: A | undefined;
  const ret: any = () => {
    if (v === undefined) v = f();
    return v;
  };
  ret.clear = () => { v = undefined };
  return ret;
}

export const timer: () => cg.Timer = () => {
  let startAt: number | undefined;
  return {
    start() { startAt = performance.now() },
    cancel() { startAt = undefined },
    stop() {
      if (!startAt) return 0;
      const time = performance.now() - startAt;
      startAt = undefined;
      return time;
    }
  };
}

export const opposite = (c: cg.Color) => c === 'white' ? 'black' : 'white';

export function containsX<X>(xs: X[] | undefined, x: X): boolean {
  return xs !== undefined && xs.indexOf(x) !== -1;
}

export const distanceSq: (pos1: cg.Pos, pos2: cg.Pos) => number = (pos1, pos2) => {
  return Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2);
}

export const samePiece: (p1: cg.Piece, p2: cg.Piece) => boolean = (p1, p2) =>
  p1.role === p2.role && p1.color === p2.color;

const posToTranslateBase: (pos: cg.Pos, asWhite: boolean, xFactor: number, yFactor: number, bt: cg.BoardDimensions) => cg.NumberPair =
(pos, asWhite, xFactor, yFactor, bt) => [
  (asWhite ? pos[0] - 1 : bt.width - pos[0]) * xFactor,
  (asWhite ? bt.height - pos[1] : pos[1] - 1) * yFactor
];

export const posToTranslateAbs = (bounds: ClientRect, bt: cg.BoardDimensions) => {
  const xFactor = bounds.width / bt.width,
  yFactor = bounds.height / bt.height;
  return (pos: cg.Pos, asWhite: boolean) => posToTranslateBase(pos, asWhite, xFactor, yFactor, bt);
};

export const posToTranslateRel: (pos: cg.Pos, asWhite: boolean, bt: cg.BoardDimensions) => cg.NumberPair =
  (pos, asWhite, bt) => posToTranslateBase(pos, asWhite, 100 / bt.width, 100 / bt.height, bt);

export const translateAbs = (el: HTMLElement, pos: cg.NumberPair) => {
  el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
}

export const translateRel = (el: HTMLElement, percents: cg.NumberPair) => {
  el.style.left = percents[0] + '%';
  el.style.top = percents[1] + '%';
}

export const setVisible = (el: HTMLElement, v: boolean) => {
  el.style.visibility = v ? 'visible' : 'hidden';
}

// touchend has no position!
export const eventPosition: (e: cg.MouchEvent) => cg.NumberPair | undefined = e => {
  if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY];
  if (e.touches && e.targetTouches[0]) return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  return undefined;
}

export const isRightButton = (e: MouseEvent) => e.buttons === 2 || e.button === 2;

export const createEl = (tagName: string, className?: string) => {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  return el;
}
