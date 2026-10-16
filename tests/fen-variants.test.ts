import { describe, expect, it } from "vitest";
import { read, write, writeBoard } from "../src/fen";
import { configure } from "../src/config";
import { defaults } from "../src/state";

const board8 = { width: 8, height: 8 };

describe("ChessgroundX FEN extensions", () => {
  it("reads multi-digit empty runs and pieces at opposite corners of a 16x16 board", () => {
    const rows = ["K15", ...Array(14).fill("16"), "15k"];
    const state = read(rows.join("/"), { width: 16, height: 16 });
    expect(state.pieces.get("a@")).toMatchObject({ role: "k-piece", color: "white" });
    expect(state.pieces.get("p1")).toMatchObject({ role: "k-piece", color: "black" });
    expect(writeBoard(state.pieces, { width: 16, height: 16 })).toBe(rows.join("/"));
  });
  it("reads Shogi prefix-promoted pieces as distinct letter roles", () => {
    const state = read("4+k3/8/8/8/8/8/8/3+R4", board8);
    expect(state.pieces.get("e8")).toMatchObject({
      role: "pk-piece",
      color: "black",
      promoted: true,
    });
    expect(state.pieces.get("d1")).toMatchObject({
      role: "pr-piece",
      color: "white",
      promoted: true,
    });
  });
  it("reads tilde promoted and vertical-bar mirrored piece flags", () => {
    const state = read("8/8/8/8/8/8/8/|R~7", board8);
    expect(state.pieces.get("a1")).toMatchObject({ role: "r-piece", promoted: true, mirror: true });
    expect(write(state, board8)).toBe("8/8/8/8/8/8/8/|R~7");
  });
  it("reads and writes counted pockets in bracket notation", () => {
    const state = read("8/8/8/8/8/8/8/8[PPNrq]", board8);
    expect(state.pockets?.white.get("p-piece")).toBe(2);
    expect(state.pockets?.white.get("n-piece")).toBe(1);
    expect(state.pockets?.black.get("r-piece")).toBe(1);
    expect(state.pockets?.black.get("q-piece")).toBe(1);
    expect(write(state, board8)).toBe("8/8/8/8/8/8/8/8[PPNrq]");
  });
  it("supports extra slash pocket notation", () => {
    expect(read("8/8/8/8/8/8/8/8/PNp", board8).pockets?.white.get("p-piece")).toBe(1);
  });
});

describe("FEN-only three-check counters and pocket configuration", () => {
  it("reads Fairy black+white counters only from full FEN and resets them on placement FEN", () => {
    const state = defaults();
    configure(state, { fen: "8/8/8/8/8/8/8/8 w - - 3+2 0 1" });
    expect(state.drawable.checkCounters).toEqual({ black: "3", white: "2" });
    configure(state, { lastMove: ["a1"] });
    expect(state.drawable.checkCounters).toEqual({ black: "3", white: "2" });
    configure(state, { fen: "8/8/8/8/8/8/8/8" });
    expect(state.drawable.checkCounters).toBeUndefined();
  });
  it("creates empty pocket maps only when pocketRoles are configured", () => {
    const state = defaults();
    configure(state, { fen: "8/8/8/8/8/8/8/8" });
    expect(state.boardState.pockets).toBeUndefined();
    configure(state, {
      pocketRoles: { white: ["p-piece"], black: ["p-piece"] },
      fen: "8/8/8/8/8/8/8/8",
    });
    expect(state.boardState.pockets?.white.size).toBe(0);
    expect(state.boardState.pockets?.black.size).toBe(0);
  });
  it("replaces a two-square last move with a one-square drop highlight", () => {
    const state = defaults();
    configure(state, { lastMove: ["e2", "e4"] });
    configure(state, { lastMove: ["e5"] });
    expect(state.lastMove).toEqual(["e5"]);
  });
});
