import { describe, expect, it } from "vitest";
import { defaults } from "../src/state";
import { configure } from "../src/config";
import { baseMove, baseNewPiece, setCheck, setPieces, toggleOrientation } from "../src/board";
import type { Piece } from "../src/types";

const rook: Piece = { role: "r-piece", color: "white" };

describe("headless variant board behavior", () => {
  it("tracks captures, callbacks, and last move without changing its FEN-only check counters", () => {
    const state = defaults();
    configure(state, { fen: "8/8/8/8/8/8/p7/R7 w - - 3+2 0 1" });
    const captured = baseMove(state, "a1", "a2");
    expect(captured).toMatchObject({ color: "black", role: "p-piece" });
    expect(state.boardState.pieces.get("a2")).toMatchObject(rook);
    expect(state.boardState.pieces.has("a1")).toBe(false);
    expect(state.lastMove).toEqual(["a1", "a2"]);
    expect(state.drawable.checkCounters).toEqual({ black: "3", white: "2" });
  });
  it("allows custom king roles to be marked as in check", () => {
    const state = defaults();
    configure(state, { fen: "8/8/8/8/8/8/8/3A4", kingRoles: ["a-piece"], check: "white" });
    expect(state.check).toEqual(["d1"]);
    setCheck(state, false);
    expect(state.check).toEqual([]);
  });
  it("supports ChessgroundX Capablanca automatic king/rook castling on 10x8", () => {
    const state = defaults();
    configure(state, { dimensions: { width: 10, height: 8 }, fen: "10/10/10/10/10/10/10/5K3R" });
    expect(baseMove(state, "f1", "i1")).toBeTruthy();
    expect(state.boardState.pieces.get("i1")?.role).toBe("k-piece");
    expect(state.boardState.pieces.get("h1")?.role).toBe("r-piece");
    expect(state.boardState.pieces.has("j1")).toBe(false);
  });
  it("consumes pocket inventory, reports a role-based drop origin, and toggles turn", () => {
    const state = defaults();
    configure(state, {
      fen: "8/8/8/8/8/8/8/8[RR]",
      pocketRoles: { white: ["r-piece"], black: [] },
    });
    expect(baseNewPiece(state, rook, "c2", true)).toBe(true);
    expect(state.boardState.pockets?.white.get("r-piece")).toBe(1);
    expect(state.boardState.pieces.get("c2")).toEqual(rook);
    expect(state.lastMove).toEqual(["R@", "c2"]);
    expect(state.turnColor).toBe("black");
    expect(baseNewPiece(state, rook, "c2", true)).toBe(false);
  });
  it("distinguishes encoded rank-16 squares from uppercase drop origins", () => {
    const state = defaults();
    configure(state, {
      dimensions: { width: 16, height: 16 },
      fen: ["R15", ...Array(15).fill("16")].join("/"),
    });
    expect(baseMove(state, "a@", "b@")).toBe(true);
    expect(state.boardState.pieces.get("b@")?.role).toBe("r-piece");
    expect(state.lastMove).toEqual(["a@", "b@"]);
  });
  it("replaces pieces without recomputing FEN-only check counters", () => {
    const state = defaults();
    configure(state, { fen: "8/8/8/8/8/8/8/8 w - - 2+1 0 1" });
    setPieces(state, new Map([["e1", { role: "k-piece", color: "white" }]]));
    expect(state.boardState.pieces.get("e1")?.role).toBe("k-piece");
    expect(state.drawable.checkCounters).toEqual({ black: "2", white: "1" });
  });
  it("flips orientation without changing logical square content", () => {
    const state = defaults();
    const before = new Map(state.boardState.pieces);
    toggleOrientation(state);
    expect(state.orientation).toBe("black");
    expect(state.boardState.pieces).toEqual(before);
  });
});
