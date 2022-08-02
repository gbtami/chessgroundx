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

`dimensions?: cg.BoardDimensions; // declare the boards size (up to 16x16)`

`variant?: cg.Variant;`

`chess960?: boolean;`

`notation?: cg.Notation; // coord notation style`

`pocketRoles?: cg.PocketRoles; // what pieces have slots in the pocket for each color`

Other differences
- Premoves are supported for all the piece types available in https://www.pychess.org
- Piece roles are NOT `pawn`, `knight`, `bishop`, `rook`, `queen`, `king`, but 
   `p-piece`, `n-piece`, `b-piece`, `r-piece`, `q-piece`, `k-piece` etc.
   They are in `*-piece` format where `*` is the corresponding piece letter used in FEN.
   Also in variants where promoted pieces needs their own role (mostly in drop variants)
   they are prefixed with `p` like `pr-piece` for promoted Rook in Shogi.
   Example [dobutsu.css](https://github.com/gbtami/pychess-variants/blob/master/static/piece/dobutsu/dobutsu.css)
- In Shogi-like variants where piece images are the same for both side but differentiated with directions you can use `.ally`/`.enemy` instead of `.white`/`.black` in .css files.
- Pockets are rendered for drop variant `.mini` boards.
