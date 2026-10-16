import { describe, expect, it, vi } from "vitest";
import { configure } from "../src/config";
import { cancelMove, setDropMode, setSelectedKey } from "../src/board";
import { defaults } from "../src/state";
import { read, write } from "../src/fen";

describe("fork-owned modules at shared integration boundaries", () => {
  it("configuration sends dimensions, promotions and pockets through the fork FEN parser", () => {
    const state = defaults();
    configure(state, {
      dimensions: { width: 10, height: 10 },
      fen: `+P9/${Array(9).fill("10").join("/")}[Rr]`,
      pocketRoles: { white: ["r-piece"], black: ["r-piece"] },
    });
    expect(state.boardState.pieces.get("a:")).toMatchObject({ role: "pp-piece", promoted: true });
    expect(state.boardState.pockets?.white.get("r-piece")).toBe(1);
    expect(state.boardState.pockets?.black.get("r-piece")).toBe(1);
    expect(
      write(read("10/10/10/10/10/10/10/10/10/10[Rr]", state.dimensions), state.dimensions),
    ).toBe("10/10/10/10/10/10/10/10/10/10[Rr]");
  });

  it("changing dimensions and FEN leaves custom premove integration active", () => {
    const hook = vi.fn(() => ["j10"]);
    const state = defaults();
    configure(state, {
      premovable: { premoveFunc: hook },
      movable: { color: "white" },
      turnColor: "black",
    });
    configure(state, {
      dimensions: { width: 10, height: 10 },
      fen: `${Array(9).fill("10").join("/")}/N9`,
    });
    setSelectedKey(state, "a1");
    expect(hook).toHaveBeenCalledOnce();
    expect(state.premovable.dests).toEqual(["j10"]);
    cancelMove(state);
    expect(state.premovable.dests).toBeUndefined();
  });

  it("predrop hook remains available after FEN replaces pocket state", () => {
    const hook = vi.fn(() => ["j10"]);
    const state = defaults();
    configure(state, {
      dimensions: { width: 10, height: 10 },
      pocketRoles: { white: ["p-piece"], black: [] },
      premovable: { predropFunc: hook },
      movable: { color: "white" },
      turnColor: "black",
      fen: `${Array(10).fill("10").join("/")}[P]`,
    });
    setDropMode(state, { role: "p-piece", color: "white" }, true);
    expect(hook).toHaveBeenCalledOnce();
    expect(state.premovable.dests).toEqual(["j10"]);
  });
});
