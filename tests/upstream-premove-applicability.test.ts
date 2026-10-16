import { describe, expect, it } from "vitest";
import { premove } from "../src/premove";
import type { BoardState, Color, Key } from "../src/types";

describe("upstream promotion-fix applicability to fork premoves", () => {
  it.each([
    ["white", "a7", "a8", false],
    ["black", "a2", "a1", false],
    ["white", "a7", "a8", true],
    ["black", "a2", "a1", true],
  ] as const)(
    "keeps %s %s-%s as a geometry candidate (friendly destination: %s)",
    (color: Color, orig: Key, dest: Key, friendlyDestination: boolean) => {
      const state: BoardState = {
        pieces: new Map([[orig, { role: "p-piece", color }]]),
      };
      if (friendlyDestination) state.pieces.set(dest, { role: "r-piece", color });
      const candidates = premove("chess", false, { width: 8, height: 8 })(state, orig, false);
      // The fork generates geometric candidates. Execution validates availability;
      // upstream's removed occupancy-trimming algorithm is not part of this API.
      expect(candidates).toContain(dest);
      expect(candidates).not.toContain(orig);
    },
  );
});
