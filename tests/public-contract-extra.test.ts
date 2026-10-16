import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import type { Api } from "../src/api";
import type { Config } from "../src/config";

function fixture(config: Config = {}) {
  const element = document.createElement("div");
  document.body.append(element);
  const api = Chessground(element, { animation: { enabled: false }, ...config });
  return { element, api };
}

afterEach(() => vi.restoreAllMocks());

describe("standalone ChessgroundX consumer API contracts", () => {
  it("preserves the public API surface needed by game, analysis and editor consumers", () => {
    const { api } = fixture();
    const methods: (keyof Api)[] = [
      "set",
      "getFen",
      "toggleOrientation",
      "move",
      "setPieces",
      "changePocket",
      "selectSquare",
      "selectPocket",
      "unselect",
      "newPiece",
      "playPremove",
      "cancelPremove",
      "cancelMove",
      "stop",
      "explode",
      "setShapes",
      "setAutoShapes",
      "getKeyAtDomPos",
      "redrawAll",
      "dragNewPiece",
      "destroy",
    ];
    for (const method of methods) expect(api[method], method).toBeTypeOf("function");
    expect(api.state.boardState.pieces).toBeInstanceOf(Map);
    api.destroy();
  });

  it("treats setPieces as a partial update and getFen as placement-only", () => {
    const { api } = fixture({ fen: "8/8/8/8/8/8/8/K6k w - - 0 1" });
    api.setPieces(
      new Map([
        ["b2", { color: "white", role: "q-piece" }],
        ["a1", undefined],
      ]),
    );
    expect(api.getFen()).toBe("8/8/8/8/8/8/1Q6/7k");
    expect(api.state.boardState.pieces.get("h1")?.role).toBe("k-piece");
    api.destroy();
  });

  it("replaces destinations rather than retaining stale map entries on set", () => {
    const { api } = fixture({ movable: { dests: new Map([["a2", ["a3"]]]) } });
    api.set({ movable: { dests: new Map([["b2", ["b3"]]]) } });
    expect(api.state.movable.dests?.has("a2")).toBe(false);
    expect(api.state.movable.dests?.get("b2")).toEqual(["b3"]);
    api.destroy();
  });

  it("resets stale last-move highlights when the consumer sends undefined", () => {
    const { api } = fixture({ lastMove: ["a1", "a2"] });
    expect(api.state.lastMove).toEqual(["a1", "a2"]);
    api.set({ lastMove: undefined });
    expect(api.state.lastMove).toBeUndefined();
    api.destroy();
  });

  it("replaces the entire lastMove array for pocket drops", () => {
    const { api } = fixture({ lastMove: ["a1", "a2"] });
    api.set({ lastMove: ["e4"] });
    expect(api.state.lastMove).toEqual(["e4"]);
    api.destroy();
  });

  it("updates configured pocket roles by their signed delta", () => {
    const { api } = fixture({
      fen: "8/8/8/8/8/8/8/8[2N]",
      pocketRoles: { white: ["n-piece"], black: [] },
    });
    api.changePocket({ color: "white", role: "n-piece" }, 3);
    expect(api.state.boardState.pockets?.white.get("n-piece")).toBe(4);
    api.changePocket({ color: "white", role: "q-piece" }, 2);
    expect(api.state.boardState.pockets?.white.get("q-piece")).toBeUndefined();
    api.destroy();
  });

  it("separates selected square lifecycle from the board position", () => {
    const { api } = fixture({ fen: "8/8/8/8/8/8/8/R7", movable: { color: "white" } });
    api.selectSquare("a1");
    expect(api.state.selectable.selected).toBe("a1");
    api.unselect();
    expect(api.state.selectable.selected).toBeUndefined();
    expect(api.getFen()).toBe("8/8/8/8/8/8/8/R7");
    api.destroy();
  });

  it("updates check markers when kingRoles changes", () => {
    const { api } = fixture({ fen: "8/8/8/8/8/8/8/4K3", check: true });
    expect(api.state.check).toEqual(["e1"]);
    api.set({ kingRoles: ["q-piece"] });
    expect(api.state.check).toEqual([]);
    api.destroy();
  });
});
