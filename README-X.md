# Main differences compared to upstream chessground

- Support board up to 16x16.
- Piece roles are NOT piece names like `pawn`, `knight`, `bishop`, `rook`, `queen`, `king`,
  but letter-based like `p-piece`, `n-piece`, `b-piece`, `r-piece`, `q-piece`, `k-piece` etc.
  They are in `*-piece` format where `*` is the corresponding piece letter used in FEN.
  Also in variants where promoted pieces need their own role (like Shogi),
  signified by prefixing with a '+' in the FEN,
  they are prefixed with `p` like `pr-piece` for Shogi's Dragon (promoted Rook).
  Example [shogi.css](https://github.com/gbtami/pychess-variants/blob/master/static/piece/shogi/shogi.css)
- In Shogi-like variants where piece images are differentiated with directions (instead of color),
  you can use the `ally`/`enemy` classes instead of `white`/`black` in CSS files.
  This can also be seen in the aforementioned shogi.css file.
- Pockets are integrated as a significant part of the library and are rendered for drop variant `mini` boards.
- Three-check remaining-check counters (the small king-corner markers) are derived exclusively from `config.fen`. Provide a full FEN containing the three-check token in Fairy format (`black+white`, for example `3+2`); placement-only FEN cannot render or update counters. API calls that do not provide FEN (`move(...)`, `newPiece(...)`, `setPieces(...)`, etc.) do not recompute these counters. To refresh them, call `set({ fen: fullFen })`.

# API Enhancement

```
// perform a move programmatically
move(orig: cg.Orig, dest: cg.Key): void;
```

The `move` method supports drop origin in addition to the traditional square origin. Signified by an uppercase letter followed by an `@`, meaning a piece of that letter is being dropped on `dest`. For example, `chessground.move('R@', 'c2')` means the turn color dropping a rook from their pocket onto the square c2.

Be careful not to use a lowercase letter for the piece though. The `@` is also used to signify the 16th rank in case your variant goes that big. Using lowercase letter like `a@` will mean moving from the square a16 instead of dropping the A piece.

# New Config types

```
premovable?: {
  premoveFunc?: cg.Premove;
  predropFunc?: cg.Predrop;
}
```

Premove and predrop functions. Takes the game's board state and the square being premoved, or piece being predropped, and returns a list of squares eligible for premoving. Defaults to orthodox chess behavior. Some variants, particularly those on [PyChess](https://www.pychess.org), have their premove functions implemented in `premove.ts` and `predrop.ts`.

```
dimensions?: cg.BoardDimensions;
```

The dimensions of the board: width and height. In the format `{ width: number, height: number }`. The default is `{ width: 8, height: 8 }`, representing an 8x8 board.

```
`variant?: cg.Variant;`
```

The name of the variant being displayed. Used for determining premove destinations. All variants in [Pychess](https://www.pychess.org) are supported. The default is `'chess'`.

```
chess960?: boolean;
```

Whether the game being represented is a [960](https://lichess.org/variant/chess960) game. Used for 960-style castling premove destinations.

```
notation?: cg.Notation;
```

Notation style for the coordinates. Supports non-algebraic styles like Xiangqi showing numbers on top and bottom, etc. Also supports some native scripts like Chinese/Kanji and Thai characters.

```
kingRoles?: cg.Role[];
```

The role(s) of the king piece. Pieces of these roles will be marked for check. By default, only the `k-piece` (the piece with the letter K, like Chess King) is marked.

```
pocketRoles?: cg.PocketRoles;
```

The roles of the piece in each side's pocket. In the format `{ white: cg.Role[], black: cg.Role[] }`. Used for internal pocket support.

# Offline development archive

Run `./download-chessgroundx-js-wheelhouse.sh` on Linux x86_64 with glibc,
Node.js, Python >=3.12, and internet access. No global pnpm is needed.
The script creates `chessgroundx-js-wheelhouse.zip` and `.js-wheelhouse/`
without changing the checkout's dependencies or generated JavaScript.
It verifies a fresh offline install from the ZIP, then runs typecheck, lint,
format checks, tests, the distribution build, and package creation.

Upload the ZIP alongside the matching source archive. After extracting both:

```bash
bash /path/to/.js-wheelhouse/install-offline.sh /path/to/chessgroundx
export PATH="/path/to/.js-wheelhouse/bin:$PATH"
cd /path/to/chessgroundx
pnpm run test
pnpm run dist
```

The archive includes the pinned pnpm and a Linux x64/glibc dependency store;
Node must already be installed. Like the pychess wheelhouse's `--ignore-engines`,
the installer disables pnpm's strict engine checks to allow the sandbox's older
Node. The project still targets Node >=24; the current locked toolchain has also
been verified on Node 22.16.0. The builder runs all checks on its actual Node
version and records it in `build-info.txt`. See `.js-wheelhouse/README.txt` for
the full workflow. Regenerate
after changing `package.json`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml`.
Set `OUTPUT_ROOT=/path/to/output` to write the artifacts outside the checkout.
