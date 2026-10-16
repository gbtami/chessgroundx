import { describe, expect, it } from "vitest";
import { predrop } from "../src/predrop";
import { read } from "../src/fen";
import type { Piece } from "../src/types";

const piece = (role: Piece["role"], color: Piece["color"]): Piece => ({ role, color });
const empty = (width: number, height: number) =>
  read(Array(height).fill(String(width)).join("/"), { width, height });

describe("variant-specific drop restrictions", () => {
  it.each(["crazyhouse", "shouse", "capahouse", "gothhouse"])(
    "%s forbids pawn drops on edge ranks",
    (variant) => {
      const keys = predrop(variant, { width: 10, height: 8 })(
        empty(10, 8),
        piece("p-piece", "white"),
      );
      expect(keys).toHaveLength(60);
      expect(keys).toContain("j2");
      expect(keys).not.toContain("a1");
      expect(keys).not.toContain("a8");
    },
  );
  it("Shogi pawn and lance cannot drop on last rank; knight cannot on last two", () => {
    const state = empty(9, 9),
      dimensions = { width: 9, height: 9 };
    const drop = predrop("shogi", dimensions);
    expect(drop(state, piece("p-piece", "white"))).toHaveLength(72);
    expect(drop(state, piece("l-piece", "black"))).not.toContain("a1");
    expect(drop(state, piece("n-piece", "white"))).toHaveLength(63);
    expect(drop(state, piece("n-piece", "white"))).not.toContain("a8");
    expect(drop(state, piece("n-piece", "white"))).not.toContain("a9");
  });
  it("placement selects opposite home ranks by color", () => {
    const state = empty(8, 8),
      drop = predrop("placement", { width: 8, height: 8 });
    expect(drop(state, piece("r-piece", "white"))).toEqual(expect.arrayContaining(["a1", "h1"]));
    expect(drop(state, piece("r-piece", "white"))).toHaveLength(8);
    expect(drop(state, piece("r-piece", "black"))).toContain("a8");
  });
  it("never permits dropping on a friendly piece, but allows enemy occupied squares", () => {
    const bd = { width: 8, height: 8 },
      state = read("8/8/8/8/8/8/8/Pp6", bd);
    const keys = predrop("crazyhouse", bd)(state, piece("n-piece", "white"));
    expect(keys).not.toContain("a1");
    expect(keys).toContain("b1");
  });
  it("grandhouse pawn restriction covers middle ranks on a 10-rank board", () => {
    const bd = { width: 10, height: 10 },
      keys = predrop("grandhouse", bd)(empty(10, 10), piece("p-piece", "white"));
    expect(keys).toHaveLength(60);
    expect(keys).toContain("a7");
    expect(keys).not.toContain("a8");
    expect(keys).not.toContain("a1");
  });
});
