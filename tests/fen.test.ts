import { expect, test } from "vitest";
import { initial, read, write } from "../src/fen";

test("write.read initial (upstream round trip, adapted to ChessgroundX BoardState)", () => {
  const dimensions = { width: 8, height: 8 };
  expect(write(read(initial, dimensions), dimensions)).toEqual(initial);
});

// Upstream's malformed-position case depends on cfdacd4/43a3c20 and an
// optional, 8x8 pos2key. The fork-owned parser/helper contracts differ.
// Its dimension-aware adaptation remains tracked in upstream-merge.md;
// do not silently assert upstream robustness or change fen.ts in this merge.
