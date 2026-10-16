// Verify the published ChessgroundX import paths consumed by the PyChess client.
// Run after `pnpm run compile`: node scripts/check-pychess-consumer.mjs
import { build } from "esbuild";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temp = await mkdtemp(join(tmpdir(), "chessgroundx-consumer-"));
try {
  await mkdir(join(temp, "node_modules"));
  await symlink(root, join(temp, "node_modules", "chessgroundx"), "dir");
  const entry = join(temp, "consumer.ts");
  await writeFile(
    entry,
    `
import { Chessground } from 'chessgroundx';
import type { Api } from 'chessgroundx/api';
import { renderResized, updateBounds } from 'chessgroundx/render';
import type * as cg from 'chessgroundx/types';
export function createBoard(element: HTMLElement, fen: cg.FEN): Api {
  const board = Chessground(element, { fen });
  void renderResized;
  void updateBounds;
  return board;
}
`,
  );
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  console.log("PyChess named and subpath import bundling: OK");
} finally {
  await rm(temp, { recursive: true, force: true });
}
