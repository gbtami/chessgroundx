Main differences compared to upstream chessground
===
New Config types

`addDimensionsCssVars?: boolean; // add --cg-width and --cg-height CSS vars containing the board's dimensions to the document root`

```
predroppable?: {
    showDropDests?: boolean;
    dropDests?: cg.Key[];
    current?: {
      // See corresponding type in state.ts for more comments
      role: cg.Role;
      key: cg.Key;
    };
```
```
dropmode?: {
    active?: boolean;
    piece?: cg.Piece;
    showDropDests?: boolean; // whether to add the move-dest class on squares for drops
    dropDests?: cg.DropDests; // see corresponding state.ts type for comments
  };
```

```
dimensions?: cg.BoardDimensions;
```
The dimensions of the board: width and height. In the format `{ width: number, height: number }`. The default is `{ width: 8, height: 8 }`, representing an 8x8 board.

```
`variant?: cg.Variant;`
```
The name of the variant being played. Used for determining premove destinations. All variants in [Pychess](https://www.pychess.org) are supported. The default is `'chess'`.

```
chess960?: boolean;
```
Whether the game being represented is a [960](https://lichess.org/variant/chess960) game. Used for 960-style castling premove destinations.

```
notation?: cg.Notation;
```
Notation style for the coordinates. More information in the `Notation` type in `types.ts` and `wrap.ts`.

```
pocketRoles?: cg.PocketRoles;
```
The roles of the piece in each side's pocket. In the format `{ white: cg.Role[], black: cg.Role[] }`. Used for internal pocket support.

Other differences
- Piece roles are NOT piece names like `pawn`, `knight`, `bishop`, `rook`, `queen`, `king`,
   but letter-based like `p-piece`, `n-piece`, `b-piece`, `r-piece`, `q-piece`, `k-piece` etc.
   They are in `*-piece` format where `*` is the corresponding piece letter used in FEN.
   Also in variants where promoted pieces needs their own role (like Shogi),
   signified by prefixing with a '+' in the FEN,
   they are prefixed with `p` like `pr-piece` for promoted Rook in Shogi.
   Example [shogi.css](https://github.com/gbtami/pychess-variants/blob/master/static/piece/shogi/shogi.css)
- In Shogi-like variants where piece images are differentiated with directions (instead of color),
    you can use `.ally`/`.enemy` classes instead of `.white`/`.black` in .css files.
    This can also be seen in the aforementioned shogi.css file.
- Pockets are rendered for drop variant `.mini` boards.
