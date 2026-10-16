import { build } from "esbuild";

// Preserve ChessgroundX's legacy script-tag contract: window.Chessground is
// the callable default export, not an ESM namespace or an object with .default.
// Upstream's ESM bundle would be an intentional API change for PyChess users.
for (const minify of [false, true]) {
  await build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "ChessgroundXModule",
    footer: { js: "var Chessground = ChessgroundXModule.default;" },
    outfile: minify ? "dist/chessground.min.js" : "dist/chessground.js",
    minify,
    target: "es2020",
  });
}
