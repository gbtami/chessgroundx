import { State } from './state.js';
import { key2pos } from './util.js';
import { Drawable, DrawShape, DrawShapePiece, DrawBrush, DrawBrushes, DrawModifiers, CheckCounters } from './draw.js';
import { SyncableShape, Hash, syncShapes } from './sync.js';
import * as cg from './types.js';

export function createElement(tagName: string): SVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', tagName);
}

type CustomBrushes = Map<string, DrawBrush>; // by hash

type ArrowDests = Map<cg.Key, number>; // how many arrows land on a square

type LabelAngles = Map<cg.Key, Set<number>>; // incoming arrow angle slots for label collision avoidance

export function renderSvg(state: State, svg: SVGElement, customSvg: SVGElement): void {
  const d = state.drawable,
    curD = d.current,
    cur = curD && curD.mouseSq ? (curD as DrawShape) : undefined,
    arrowDests: ArrowDests = new Map(),
    labelAngles: LabelAngles = new Map(),
    bounds = state.dom.bounds(),
    nonPieceAutoShapes = d.autoShapes.filter(autoShape => !autoShape.piece),
    hasLabels = d.shapes.concat(nonPieceAutoShapes).some(shape => shape.label),
    counterShapes = checkCounterShapes(state, d.checkCounters);

  for (const s of d.shapes.concat(nonPieceAutoShapes).concat(counterShapes).concat(cur ? [cur] : [])) {
    if (s.dest) arrowDests.set(s.dest, (arrowDests.get(s.dest) || 0) + 1);
    if (hasLabels && s.dest && s.dest !== s.orig && s.brush && !s.customSvg) {
      const from = pos2user(orient(key2pos(s.orig), state.orientation, state.dimensions), bounds, state.dimensions),
        to = pos2user(orient(key2pos(s.dest), state.orientation, state.dimensions), bounds, state.dimensions),
        slots = labelAngles.get(s.dest) || new Set<number>();
      slots.add(angleSlot(from, to));
      labelAngles.set(s.dest, slots);
    }
  }

  const shapes: SyncableShape[] = d.shapes.concat(nonPieceAutoShapes).concat(counterShapes).map((s: DrawShape) => {
    return {
      shape: s,
      current: false,
      hash: shapeHash(s, arrowDests, false, bounds, labelAngles, d.brushes),
    };
  });
  if (cur)
    shapes.push({
      shape: cur,
      current: true,
      hash: shapeHash(cur, arrowDests, true, bounds, labelAngles, d.brushes),
    });

  const fullHash = shapes.map(sc => sc.hash).join(';');
  if (fullHash === state.drawable.prevSvgHash) return;
  state.drawable.prevSvgHash = fullHash;

  /*
    -- DOM hierarchy --
    <svg class="cg-shapes">      (<= svg)
      <defs>
        ...(for brushes)...
      </defs>
      <g>
        ...(for arrows and circles)...
      </g>
    </svg>
    <svg class="cg-custom-svgs"> (<= customSvg)
      <g>
        ...(for custom svgs)...
      </g>
    </svg>
  */

  const defsEl = svg.querySelector('defs') as SVGElement;
  const shapesEl = svg.querySelector('g') as SVGElement;
  const customSvgsEl = customSvg.querySelector('g') as SVGElement;

  syncDefs(d, shapes, defsEl);
  syncShapes(
    shapes.filter(s => !s.shape.customSvg && s.shape.brush),
    shapesEl,
    shape => renderShape(state, shape, d.brushes, arrowDests, bounds)
  );
  syncShapes(
    shapes.filter(s => s.shape.customSvg || s.shape.label),
    customSvgsEl,
    shape => renderOverlay(state, shape, d.brushes, arrowDests, labelAngles, bounds)
  );
}

function checkCounterShapes(state: State, counters: CheckCounters | undefined): DrawShape[] {
  if (!counters) return [];
  const kings: { [key in cg.Color]?: cg.Key } = {};
  for (const [key, piece] of state.boardState.pieces) {
    if (state.kingRoles.includes(piece.role)) kings[piece.color] = key;
  }
  const shapes: DrawShape[] = [];
  if (kings.white) shapes.push({ orig: kings.white, customSvg: checkCounterSvg(counters.white, 'white') });
  if (kings.black) shapes.push({ orig: kings.black, customSvg: checkCounterSvg(counters.black, 'black') });
  return shapes;
}

function checkCounterSvg(cnt: string, colorKey: cg.Color): string {
  const color = checkCounterColor(cnt);
  const shadowId = `shadow-${colorKey}`;
  return `
<svg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' version='1.1' transform='translate(66 0)'>
<defs>
  <filter id='${shadowId}'>
    <feDropShadow dx='2' dy='4' stdDeviation='2' flood-opacity='0.5' />
  </filter>
</defs>
<circle cx='16' cy='16' r='16' style='fill:${color};filter:url(#${shadowId})'/>
<text font-family='Noto Sans, Sans-Serif' font-size='28' font-weight='bold' x='50%' y='50%' dy='.36em' fill='#fff' text-anchor='middle'>${cnt}</text>
</svg>`;
}

function checkCounterColor(cnt: string): string {
  const num = Number(cnt);
  if (num === 0) return 'darkgrey';
  if (num === 1) return '#df5353';
  if (num === 2) return '#e69f00';
  return 'darkkhaki';
}

// append only. Don't try to update/remove.
function syncDefs(d: Drawable, shapes: SyncableShape[], defsEl: SVGElement) {
  const brushes: CustomBrushes = new Map();
  let brush: DrawBrush;
  for (const s of shapes) {
    if (s.shape.dest && s.shape.brush && !s.shape.customSvg) {
      brush = d.brushes[s.shape.brush!];
      if (s.shape.modifiers) brush = makeCustomBrush(brush, s.shape.modifiers);
      brushes.set(brush.key, brush);
    }
  }
  const keysInDom = new Set();
  let el: SVGElement | undefined = defsEl.firstElementChild as SVGElement;
  while (el) {
    keysInDom.add(el.getAttribute('cgKey'));
    el = el.nextElementSibling as SVGElement | undefined;
  }
  for (const [key, brush] of brushes.entries()) {
    if (!keysInDom.has(key)) defsEl.appendChild(renderMarker(brush));
  }
}

function shapeHash(
  { orig, dest, brush, piece, modifiers, customSvg, label }: DrawShape,
  arrowDests: ArrowDests,
  current: boolean,
  bounds: ClientRect,
  labelAngles: LabelAngles,
  brushes: DrawBrushes
): Hash {
  return [
    bounds.width,
    bounds.height,
    current,
    orig,
    dest,
    brush,
    dest && (arrowDests.get(dest) || 0) > 1,
    piece && pieceHash(piece),
    modifiers && modifiersHash(modifiers),
    customSvg && customSvgHash(customSvg),
    // Include the actual incoming directions: replacing one arrow can move a
    // label even when the number of arrows at its destination stays the same.
    label && JSON.stringify([
      label.text,
      label.fill ?? (brush ? brushes[brush]?.color : undefined) ?? '#666',
      dest && [...(labelAngles.get(dest) || [])].sort((a, b) => a - b),
    ]),
  ]
    .filter(x => x)
    .join(',');
}

function pieceHash(piece: DrawShapePiece): Hash {
  return [piece.color, piece.role, piece.promoted, piece.scale].filter(x => x).join(',');
}

function modifiersHash(m: DrawModifiers): Hash {
  return '' + (m.lineWidth || '');
}

function customSvgHash(s: string): Hash {
  // Rolling hash with base 31 (cf. https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript)
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
  }
  return 'custom-' + h.toString();
}

function renderShape(
  state: State,
  { shape, current, hash }: SyncableShape,
  brushes: DrawBrushes,
  arrowDests: ArrowDests,
  bounds: ClientRect
): SVGElement {
  let el: SVGElement;
  const orig = orient(key2pos(shape.orig), state.orientation, state.dimensions);

  if (shape.customSvg) {
    el = renderCustomSvg(shape.customSvg, orig, bounds, state.dimensions);
  } else {
    if (shape.dest && shape.dest !== shape.orig) {
      let brush: DrawBrush = brushes[shape.brush!];
      if (shape.modifiers) brush = makeCustomBrush(brush, shape.modifiers);
      el = renderArrow(
        brush,
        orig,
        orient(key2pos(shape.dest), state.orientation, state.dimensions),
        current,
        (arrowDests.get(shape.dest) || 0) > 1,
        bounds,
        state.dimensions
      );
    } else el = renderCircle(brushes[shape.brush!], orig, current, bounds, state.dimensions);
  }
  el.setAttribute('cgHash', hash);
  return el;
}

function renderCustomSvg(customSvg: string, pos: cg.Pos, bounds: ClientRect, bd: cg.BoardDimensions): SVGElement {
  const [x, y] = pos2user(pos, bounds, bd);

  // Translate to top-left of `orig` square
  const g = setAttributes(createElement('g'), { transform: `translate(${x},${y})` });

  // Give 100x100 coordinate system to the user for `orig` square
  const svg = setAttributes(createElement('svg'), { width: 1, height: 1, viewBox: '0 0 100 100' });

  g.appendChild(svg);
  svg.innerHTML = customSvg;
  return g;
}

function renderOverlay(
  state: State,
  syncable: SyncableShape,
  brushes: DrawBrushes,
  arrowDests: ArrowDests,
  labelAngles: LabelAngles,
  bounds: ClientRect
): SVGElement {
  const { shape, hash } = syncable;
  if (!shape.label) return renderShape(state, syncable, brushes, arrowDests, bounds);

  const bd = state.dimensions,
    orig = orient(key2pos(shape.orig), state.orientation, bd),
    from = pos2user(orig, bounds, bd),
    isArrow = shape.dest && shape.dest !== shape.orig && shape.brush && !shape.customSvg,
    to = isArrow ? pos2user(orient(key2pos(shape.dest!), state.orientation, bd), bounds, bd) : from,
    cellOrig = pos2user([0, 0], bounds, bd),
    cellNext = pos2user([1, 1], bounds, bd),
    scale = Math.min(Math.abs(cellNext[0] - cellOrig[0]), Math.abs(cellNext[1] - cellOrig[1])),
    at: cg.NumberPair = [to[0], to[1]],
    corner = !shape.brush;

  if (isArrow) {
    const dx = to[0] - from[0],
      dy = to[1] - from[1],
      distance = Math.hypot(dx, dy),
      slot = angleSlot(from, to),
      slots = labelAngles.get(shape.dest!)!,
      adjacent = slots.has((slot + 1) % 16) || slots.has((slot + 15) % 16),
      // Keep the fork's existing shortening rule. Nearby knight/bishop shafts
      // get additional label separation without changing arrow geometry.
      backoff = 33 / 64 + ((arrowDests.get(shape.dest!) || 0) > 1 ? 10 / 64 : 0) +
        (slot % 2 && adjacent ? 0.4 * scale : 0),
      along = Math.max(0, distance - backoff) / distance;
    at[0] = from[0] + dx * along;
    at[1] = from[1] + dy * along;
  } else if (corner) {
    at[0] += 0.4 * scale;
    at[1] -= 0.4 * scale;
  }

  const g = setAttributes(createElement('g'), { cgHash: hash });
  if (shape.customSvg) g.appendChild(renderCustomSvg(shape.customSvg, orig, bounds, bd));
  // Custom SVGs use a viewBox shifted half a unit from the arrow/circle plane.
  const label = setAttributes(createElement('g'), {
    class: 'cg-label',
    transform: `translate(${at[0] + 0.5},${at[1] + 0.5})`,
  });
  label.appendChild(setAttributes(createElement('circle'), {
    r: 0.2 * scale,
    'fill-opacity': corner ? 1 : 0.8,
    'stroke-opacity': corner ? 1 : 0.7,
    'stroke-width': 0.03 * scale,
    fill: shape.label.fill ?? (shape.brush ? brushes[shape.brush]?.color : undefined) ?? '#666',
    stroke: 'white',
  }));
  const textScale = 0.75 ** Array.from(shape.label.text).length,
    text = setAttributes(createElement('text'), {
      'font-size': 0.4 * scale * textScale,
      'font-family': 'Noto Sans, sans-serif',
      'text-anchor': 'middle',
      fill: 'white',
      y: 0.13 * scale * textScale,
    });
  text.textContent = shape.label.text;
  label.appendChild(text);
  g.appendChild(label);
  return g;
}

function angleSlot(from: cg.NumberPair, to: cg.NumberPair): number {
  return (Math.round(Math.atan2(to[1] - from[1], to[0] - from[0]) * 8 / Math.PI) + 16) % 16;
}

function renderCircle(
  brush: DrawBrush,
  pos: cg.Pos,
  current: boolean,
  bounds: ClientRect,
  bd: cg.BoardDimensions
): SVGElement {
  const o = pos2user(pos, bounds, bd),
    widths = circleWidth(),
    radius = Math.min(bd.width / (2 * bd.height), (bounds.width / bd.width) / (2 * bounds.height / bd.height));
  return setAttributes(createElement('circle'), {
    stroke: brush.color,
    'stroke-width': widths[current ? 0 : 1],
    fill: 'none',
    opacity: opacity(brush, current),
    cx: o[0],
    cy: o[1],
    r: radius - widths[1] / 2,
  });
}

function renderArrow(
  brush: DrawBrush,
  orig: cg.Pos,
  dest: cg.Pos,
  current: boolean,
  shorten: boolean,
  bounds: ClientRect,
  bd: cg.BoardDimensions
): SVGElement {
  const m = arrowMargin(shorten && !current),
    a = pos2user(orig, bounds, bd),
    b = pos2user(dest, bounds, bd),
    dx = b[0] - a[0],
    dy = b[1] - a[1],
    angle = Math.atan2(dy, dx),
    xo = Math.cos(angle) * m,
    yo = Math.sin(angle) * m;
  return setAttributes(createElement('line'), {
    stroke: brush.color,
    'stroke-width': lineWidth(brush, current),
    'stroke-linecap': 'round',
    'marker-end': 'url(#arrowhead-' + brush.key + ')',
    opacity: opacity(brush, current),
    x1: a[0],
    y1: a[1],
    x2: b[0] - xo,
    y2: b[1] - yo,
  });
}

function renderMarker(brush: DrawBrush): SVGElement {
  const marker = setAttributes(createElement('marker'), {
    id: 'arrowhead-' + brush.key,
    orient: 'auto',
    markerWidth: 4,
    markerHeight: 8,
    refX: 2.05,
    refY: 2.01,
  });
  marker.appendChild(
    setAttributes(createElement('path'), {
      d: 'M0,0 V4 L3,2 Z',
      fill: brush.color,
    })
  );
  marker.setAttribute('cgKey', brush.key);
  return marker;
}

export function setAttributes(el: SVGElement, attrs: { [key: string]: any }): SVGElement {
  for (const key in attrs) {
    if (Object.prototype.hasOwnProperty.call(attrs, key)) el.setAttribute(key, attrs[key]);
  }
  return el;
}

function orient(pos: cg.Pos, color: cg.Color, bd: cg.BoardDimensions): cg.Pos {
  return color === 'white' ? pos : [bd.width - 1 - pos[0], bd.height - 1 - pos[1]];
}

function makeCustomBrush(base: DrawBrush, modifiers: DrawModifiers): DrawBrush {
  return {
    color: base.color,
    opacity: Math.round(base.opacity * 10) / 10,
    lineWidth: Math.round(modifiers.lineWidth || base.lineWidth),
    key: [base.key, modifiers.lineWidth].filter(x => x).join(''),
  };
}

function circleWidth(): [number, number] {
  return [3 / 64, 4 / 64];
}

function lineWidth(brush: DrawBrush, current: boolean): number {
  return ((brush.lineWidth || 10) * (current ? 0.85 : 1)) / 64;
}

function opacity(brush: DrawBrush, current: boolean): number {
  return (brush.opacity || 1) * (current ? 0.9 : 1);
}

function arrowMargin(shorten: boolean): number {
  return (shorten ? 20 : 10) / 64;
}

function pos2user(pos: cg.Pos, bounds: ClientRect, bd: cg.BoardDimensions): cg.NumberPair {
    let xScale, yScale;
    // Janggi/Xiangqi board needs different calculation
    if (bd.width === 9 && bd.height === 10) {
        xScale = Math.max(1, bounds.width / bounds.height) * Math.min(1, bd.height / bd.width);
        yScale = Math.max(1, bounds.height / bounds.width) * (bd.width / bd.height);
    } else {
        xScale = Math.min(1, bounds.width / bounds.height) * Math.max(1, bd.height / bd.width);
        yScale = Math.min(1, bounds.height / bounds.width) * Math.max(1, bd.width / bd.height);
    }
  return [(pos[0] - (bd.width - 1) / 2) * xScale, ((bd.height - 1) / 2 - pos[1]) * yScale];
}
