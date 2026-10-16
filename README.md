# Chessgroundx

[![Continuous Integration](https://github.com/gbtami/chessgroundx/actions/workflows/nodejs.yml/badge.svg)](https://github.com/gbtami/chessgroundx/actions/workflows/nodejs.yml)
[![npm](https://img.shields.io/npm/v/chessgroundx)](https://www.npmjs.com/package/chessgroundx)

![Chessground Xiangqi and Shogi](/screenshot/chessgroundx.png)
![Chessground in 2D and 3D](/screenshot/twin.jpg)

_Chessground_ is a free/libre open source chess UI developed for
[lichess.org](https://lichess.org).
It targets modern browsers, as well as mobile development using Cordova.
ChessgroundX extends it for variant boards, roles and pockets; see [README-X.md](README-X.md).

## License

Chessground is distributed under the **GPL-3.0 license** (or any later version,
at your option).
When you use Chessground for your website, your combined work may be
distributed only under the GPL. **You must release your source code** to the
users of your website.

Please read more about GPL for JavaScript on [greendrake.info](https://greendrake.info/publications/js-gpl).

## Demos

- [Embedded PGN viewer](https://github.com/lichess-org/pgn-viewer)
- [Chess TV](https://lichess.org/tv)
- [Board editor](https://lichess.org/editor)
- [Puzzles](https://lichess.org/training)
- [Analysis board](https://lichess.org/ofWXRFGy)
- [Game preview](https://lichess.org/games)

## Features

Chessground is designed to fulfill all lichess.org web and mobile apps needs, so it is pretty featureful.

- Well typed with TypeScript
- Fast. Uses a custom DOM diff algorithm to reduce DOM writes to the absolute minimum.
- No runtime dependencies.
- SVG drawing of circles, arrows, and custom user shapes on the board
- Arrows snap to valid moves. Freehand arrows can be drawn by dragging the mouse off the board and back while drawing an arrow.
- Entirely configurable and reconfigurable at any time
- Styling with CSS only: board and pieces can be changed by simply switching a class
- Fluid layout: board can be resized at any time
- Support for 3D pieces and boards
- Full mobile support (touchstart, touchmove, touchend)
- Move pieces by click
- Move pieces by drag & drop
  - Minimum distance before drag
  - Centralisation of the piece under the cursor
  - Piece ghost element
  - Drop off revert or trash
- Premove by click or drag
- Drag new pieces onto the board (editor, Crazyhouse)
- Animation of pieces: moving and fading away
- Display last move, check, move destinations, and premove destinations (hover effects possible)
- Import and export positions in FEN notation
- User callbacks
- No chess logic inside: can be used for [chess variants](https://lichess.org/variant)

## Installation

```
npm install --save chessgroundx
```

### Usage

```js
import { Chessground } from 'chessgroundx';

const config = {};
const ground = Chessground(document.body, config);
```

### Wrappers

- React: [react-chess/chessground](https://github.com/react-chess/chessground), [ruilisi/react-chessground](https://github.com/ruilisi/react-chessground)
- Vue.js: [vitogit/vue-chessboard](https://github.com/vitogit/vue-chessboard)
- Angular: [topce/ngx-chessground](https://github.com/topce/ngx-chessground)
- Svelte: [gtm-nayan/svelte-use-chessground](https://github.com/gtm-nayan/svelte-use-chessground)

More? Please make a pull request to include it here.

## Documentation

- [Config types](src/config.ts)
- [Default config values](src/state.ts)
- [API type signatures](src/api.ts)
- [Simple standalone example](demo.html)
- [Examples repo](https://github.com/lichess-org/chessground-examples/tree/master/src/units)
- [Base CSS](https://github.com/lichess-org/chessground-examples/blob/master/assets/chessground.css)

## Development

Use Node.js >=24 and the pinned pnpm 12.10.0. Install build dependencies:

```sh
pnpm install --frozen-lockfile
```

To build the node module:

```sh
pnpm run compile --watch
```

To build the standalone:

```sh
pnpm run dist
```

Run the local checks:

```sh
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run check-format
pnpm run test:consumer
```

Run `pnpm run dist` before the consumer check or standalone browser checks.
See [upstream-merge.md](upstream-merge.md) for synchronization decisions and
local browser validation. Package entry points and fork APIs are retained;
upstream release automation is not part of this synchronization.
