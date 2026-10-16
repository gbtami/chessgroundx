import { describe, expect, it } from "vitest";
import { configure } from "../src/config";
import { premove } from "../src/premove";
import { defaults } from "../src/state";
import type { Color, Role } from "../src/types";

// These are fork-specific *mobility* checks, not legality checks. Premove is
// intentionally allowed to include destinations occupied by other pieces.
const cases: Array<{
  variant: string;
  role: Role;
  color: Color;
  from: string;
  yes: string[];
  no: string[];
  width?: number;
  height?: number;
}> = [
  {
    variant: "chess",
    role: "n-piece",
    color: "white",
    from: "d4",
    yes: ["b3", "b5", "c2", "e6", "f5"],
    no: ["d5", "e5"],
  },
  {
    variant: "capablanca",
    role: "c-piece",
    color: "white",
    from: "d4",
    yes: ["d8", "d1", "b3", "f5"],
    no: ["e5", "f6"],
    width: 10,
  },
  {
    variant: "capablanca",
    role: "a-piece",
    color: "white",
    from: "d4",
    yes: ["a1", "g7", "b3", "f5"],
    no: ["d8", "d5"],
    width: 10,
  },
  {
    variant: "seirawan",
    role: "h-piece",
    color: "white",
    from: "d4",
    yes: ["f5", "a1"],
    no: ["d8"],
  },
  {
    variant: "seirawan",
    role: "e-piece",
    color: "white",
    from: "d4",
    yes: ["d8", "b3"],
    no: ["g7"],
  },
  {
    variant: "ataxx",
    role: "p-piece",
    color: "white",
    from: "d4",
    yes: ["d5", "f6", "b2"],
    no: ["a1", "g7"],
  },
  {
    variant: "xiangqi",
    role: "r-piece",
    color: "black",
    from: "e5",
    yes: ["e:", "a5"],
    no: ["f6"],
    width: 9,
    height: 10,
  },
  {
    variant: "xiangqi",
    role: "n-piece",
    color: "white",
    from: "e5",
    yes: ["f7", "c4"],
    no: ["e6"],
    width: 9,
    height: 10,
  },
  {
    variant: "janggi",
    role: "r-piece",
    color: "black",
    from: "e5",
    yes: ["e:", "a5"],
    no: ["f6"],
    width: 9,
    height: 10,
  },
  {
    variant: "shogi",
    role: "p-piece",
    color: "white",
    from: "e5",
    yes: ["e6"],
    no: ["e4", "d6"],
    width: 9,
    height: 9,
  },
  {
    variant: "shogi",
    role: "p-piece",
    color: "black",
    from: "e5",
    yes: ["e4"],
    no: ["e6", "d4"],
    width: 9,
    height: 9,
  },
  {
    variant: "shogi",
    role: "l-piece",
    color: "white",
    from: "e5",
    yes: ["e6", "e9"],
    no: ["e4", "d6"],
    width: 9,
    height: 9,
  },
  {
    variant: "shogi",
    role: "n-piece",
    color: "white",
    from: "e5",
    yes: ["d7", "f7"],
    no: ["d3", "f6"],
    width: 9,
    height: 9,
  },
  {
    variant: "shogi",
    role: "pp-piece",
    color: "white",
    from: "e5",
    yes: ["e6", "d5", "f5"],
    no: ["d4", "f4"],
    width: 9,
    height: 9,
  },
  {
    variant: "shogi",
    role: "pr-piece",
    color: "black",
    from: "e5",
    yes: ["a5", "e9", "d4"],
    no: ["c3", "f7"],
    width: 9,
    height: 9,
  },
  {
    variant: "shogi",
    role: "pb-piece",
    color: "white",
    from: "e5",
    yes: ["a1", "h8", "e4"],
    no: ["e7", "c5"],
    width: 9,
    height: 9,
  },
  {
    variant: "kyotoshogi",
    role: "pp-piece",
    color: "white",
    from: "c3",
    yes: ["c1", "a3"],
    no: ["d4"],
    width: 5,
    height: 5,
  },
  {
    variant: "kyotoshogi",
    role: "ps-piece",
    color: "black",
    from: "c3",
    yes: ["a1", "e5"],
    no: ["c4"],
    width: 5,
    height: 5,
  },
  {
    variant: "dobutsu",
    role: "e-piece",
    color: "white",
    from: "b2",
    yes: ["a1", "c3"],
    no: ["b3"],
    width: 3,
    height: 4,
  },
  {
    variant: "dobutsu",
    role: "g-piece",
    color: "white",
    from: "b2",
    yes: ["b3", "a2"],
    no: ["c3"],
    width: 3,
    height: 4,
  },
  {
    variant: "makruk",
    role: "q-piece",
    color: "white",
    from: "d4",
    yes: ["c3", "e5"],
    no: ["d5", "f6"],
  },
  { variant: "makruk", role: "p-piece", color: "white", from: "d2", yes: ["d3"], no: ["d4"] },
  {
    variant: "unknown-custom",
    role: "z-piece",
    color: "white",
    from: "d4",
    yes: [],
    no: ["d5", "e5", "f6"],
  },
];

describe("fork-specific variant premove mobility matrix", () => {
  it.each(cases)(
    "$variant $color $role from $from",
    ({ variant, role, color, from, yes, no, width = 8, height = 8 }) => {
      const state = defaults();
      configure(state, { variant, dimensions: { width, height } });
      state.boardState.pieces.clear();
      state.boardState.pieces.set(from, { color, role });
      const destinations = premove(variant, false, { width, height })(
        state.boardState,
        from,
        false,
      );
      for (const square of yes)
        expect(destinations, `${square} must be available`).toContain(square);
      for (const square of no)
        expect(destinations, `${square} must not be available`).not.toContain(square);
      expect(new Set(destinations).size).toBe(destinations.length);
    },
  );
});
