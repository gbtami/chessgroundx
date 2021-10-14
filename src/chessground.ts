import { Api, start } from './api';
import { Config, configure } from './config';
import { HeadlessState, State, defaults } from './state';

import { renderWrap } from './wrap';
import * as events from './events';
import { render, renderResized, updateBounds } from './render';
import * as svg from './svg';
import * as util from './util';
import {pocketView, refreshPockets} from "./pocket";
import { initPockets } from "./pockTempStuff";

export function Chessground(element: HTMLElement, pocket0?: HTMLElement, pocket1?: HTMLElement, config?: Config): Api {
  const maybeState: State | HeadlessState = defaults();
  maybeState.pockets.pocketRoles=config!.pocketRoles!;//todo;niki:see also state.dom
  maybeState.pockets.fen=config!.fen;
  configure(maybeState, config || {});
  initPockets(maybeState);

  function redrawAll(): State {
    const prevUnbind = 'dom' in maybeState ? maybeState.dom.unbind : undefined;
    // compute bounds from existing board element if possible
    // this allows non-square boards from CSS to be handled (for 3D)
    const elements = renderWrap(element, maybeState),
      bounds = util.memo(() => elements.board.getBoundingClientRect()),
      redrawNow = (skipSvg?: boolean): void => {
        render(state);
        if (!skipSvg && elements.svg) svg.renderSvg(state, elements.svg, elements.customSvg!);
        refreshPockets(state);
      },
      onResize = (): void => {
        updateBounds(state);
        renderResized(state);
      };
    if (pocket0) {
      elements.pocketTop = pocketView(maybeState as State,"top");
      pocket0.replaceWith(elements.pocketTop);//todo:niki:maybe better to use existing/given pocket0 element instead of replacing it - that is what they do in renderWrap for the chess board
    }
    if (pocket1) {
      elements.pocketBottom = pocketView(maybeState as State, "bottom");
      pocket1.replaceWith(elements.pocketBottom);
    }

    const state = maybeState as State;
    state.dom = {
      elements,
      bounds,
      redraw: debounceRedraw(redrawNow),
      redrawNow,
      unbind: prevUnbind,
    };
    state.drawable.prevSvgHash = '';
    updateBounds(state);
    redrawNow(false);
    events.bindBoard(state, onResize);
    if (!prevUnbind) state.dom.unbind = events.bindDocument(state, onResize);
    state.events.insert && state.events.insert(elements);
    return state;
  }

  const api = start(redrawAll(), redrawAll);

  return api;
}

function debounceRedraw(redrawNow: (skipSvg?: boolean) => void): () => void {
  let redrawing = false;
  return () => {
    if (redrawing) return;
    redrawing = true;
    requestAnimationFrame(() => {
      redrawNow();
      redrawing = false;
    });
  };
}
