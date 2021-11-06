import { HeadlessState } from './state';
import { setVisible, createEl } from './util';
import { colors, letters, Elements, Notation } from './types';
import { createElement as createSVG, setAttributes } from './svg';

type CoordFormat = {
  coords: readonly string[],
  position: 'top' | 'bottom' | 'side',
  direction: 'forward' | 'backward',  // "Forward" means bottom to top / left to right
  noBlackReverse?: boolean,           // Don't reverse the direction for black orientation
};

const LETTER_ENGLISH = letters;
const NUMBER_ARABIC = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;
const NUMBER_JANGGI = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

const coordFormat: Record<Notation, CoordFormat[]> = {
  [Notation.ALGEBRAIC]: [{
    coords: LETTER_ENGLISH,
    position: 'bottom',
    direction: 'forward',
  }, {
    coords: NUMBER_ARABIC,
    position: 'side',
    direction: 'forward',
  }],

  [Notation.SHOGI_ENGLET]: [{
    coords: NUMBER_ARABIC,
    position: 'top',
    direction: 'backward',
  }, {
    coords: LETTER_ENGLISH,
    position: 'side',
    direction: 'backward',
  }],

  [Notation.SHOGI_ARBNUM]: [{
    coords: NUMBER_ARABIC,
    position: 'top',
    direction: 'backward',
  }, {
    coords: NUMBER_ARABIC,
    position: 'side',
    direction: 'backward',
  }],

  [Notation.JANGGI]: [{
    coords: NUMBER_ARABIC,
    position: 'bottom',
    direction: 'forward',
  }, {
    coords: NUMBER_JANGGI,
    position: 'side',
    direction: 'backward',
  }],

  [Notation.XIANGQI_ARBNUM]: [{
    coords: NUMBER_ARABIC,
    position: 'top',
    direction: 'forward',
    noBlackReverse: true,
  }, {
    coords: NUMBER_ARABIC,
    position: 'bottom',
    direction: 'backward',
    noBlackReverse: true,
  }],
};

export function renderWrap(element: HTMLElement, s: HeadlessState): Elements {
  // .cg-wrap (element passed to Chessground)
  //   cg-container
  //     cg-board
  //     svg.cg-shapes
  //       defs
  //       g
  //     svg.cg-custom-svgs
  //       g
  //     coords.ranks
  //     coords.files
  //     piece.ghost

  element.innerHTML = '';

  // ensure the cg-wrap class is set
  // so bounds calculation can use the CSS width/height values
  // add that class yourself to the element before calling chessground
  // for a slight performance improvement! (avoids recomputing style)
  element.classList.add('cg-wrap');

  for (const c of colors) element.classList.toggle('orientation-' + c, s.orientation === c);
  element.classList.toggle('manipulable', !s.viewOnly);

  const container = createEl('cg-container');
  element.appendChild(container);

  const extension = createEl('extension');
  container.appendChild(extension);
  const board = createEl('cg-board');
  container.appendChild(board);

  let svg: SVGElement | undefined;
  let customSvg: SVGElement | undefined;
  if (s.drawable.visible) {
    const width = s.dimensions.width;
    const height = s.dimensions.height;
    svg = setAttributes(createSVG('svg'), {
      class: 'cg-shapes',
      viewBox: `${-width / 2} ${-height / 2} ${width} ${height}`,
      preserveAspectRatio: 'xMidYMid slice',
    });
    svg.appendChild(createSVG('defs'));
    svg.appendChild(createSVG('g'));
    customSvg = setAttributes(createSVG('svg'), {
      class: 'cg-custom-svgs',
      viewBox: `${-(width - 1) / 2} ${-(height - 1) / 2} ${width} ${height}`,
      preserveAspectRatio: 'xMidYMid slice',
    });
    customSvg.appendChild(createSVG('g'));
    container.appendChild(svg);
    container.appendChild(customSvg);
  }

  if (s.coordinates) {
    coordFormat[s.notation].forEach(f => {
      const max = f.position === 'side' ? s.dimensions.height : s.dimensions.width;
      const coords = f.coords.slice(0, max);
      container.appendChild(renderCoords(coords, `${f.position} ${f.direction}${f.noBlackReverse ? '' : ' ' + s.orientation}`));
    });
  }

  let ghost: HTMLElement | undefined;
  if (s.draggable.showGhost) {
    ghost = createEl('piece', 'ghost');
    setVisible(ghost, false);
    container.appendChild(ghost);
  }

  return {
    board,
    container,
    wrap: element,
    ghost,
    svg,
    customSvg,
  };
}

function renderCoords(elems: readonly string[], className: string): HTMLElement {
  const el = createEl('coords', className);
  let f: HTMLElement;
  for (const elem of elems) {
    f = createEl('coord');
    f.textContent = elem;
    el.appendChild(f);
  }
  return el;
}
