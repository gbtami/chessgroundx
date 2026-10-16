import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { read as fenRead, write as fenWrite } from "../src/fen";
import * as util from "../src/util";
import type { BoardDimensions } from "../src/types";

// Regression fixtures derived from PyChess client/cgCtrl.ts, client/aliceBoard.ts,
// client/roundCtrl.ts and client/study/studyGamebookPlayback.ts.
const board8: BoardDimensions = { width: 8, height: 8 };
const bounds = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 800,
  bottom: 800,
  width: 800,
  height: 800,
  toJSON: () => ({}),
};

afterEach(() => vi.restoreAllMocks());

function mount(config: Parameters<typeof Chessground>[1] = {}) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(bounds);
  const element = document.createElement("div");
  document.body.append(element);
  return Chessground(element, { animation: { enabled: false }, ...config });
}

describe("contracts used by the PyChess client", () => {
  it("exposes separate CSS dimension variables for the two Bughouse boards", () => {
    const cssTarget = document.createElement("div");
    document.body.append(cssTarget);
    const a = mount({ addDimensionsCssVarsTo: cssTarget, dimensionsCssVarsSuffix: "a" });
    const b = mount({ addDimensionsCssVarsTo: cssTarget, dimensionsCssVarsSuffix: "b" });
    expect(cssTarget.style.getPropertyValue("--cg-width-a")).toBe("800px");
    expect(cssTarget.style.getPropertyValue("--cg-height-b")).toBe("800px");
    expect(cssTarget.style.getPropertyValue("--cg-width-b")).toBe("800px");
    expect(cssTarget.style.getPropertyValue("--cg-width")).toBe("");
    a.destroy();
    b.destroy();
  });

  it("retains Alice mirror markers for board separation and removes them from extracted board B", () => {
    const placement = "8/8/8/8/8/8/8/|R6r";
    const original = fenRead(placement, board8);
    expect(original.pieces.get("a1")?.mirror).toBe(true);
    expect(original.pieces.get("h1")?.mirror).not.toBe(true);
    const boardB = fenRead(placement, board8);
    for (const [key, piece] of boardB.pieces) {
      if (!piece.mirror) boardB.pieces.delete(key);
      else boardB.pieces.set(key, { ...piece, mirror: false });
    }
    expect(fenWrite(boardB, board8)).toBe("8/8/8/8/8/8/8/R7");
    expect(fenWrite(original, board8)).toBe(placement);
  });

  it("keeps the standalone root entry point's Chessground factory compatible", async () => {
    const entry = await import("../src/index");
    expect(entry.default).toBe(Chessground);
  });

  it("supports PyChess role conversion for promoted shogi and custom roles", () => {
    for (const letter of ["P", "N", "+P", "+R", "A", "Z"] as const) {
      const role = util.roleOf(letter);
      expect(util.roleOf(util.letterOf(role))).toBe(role);
    }
    expect(util.dropOrigOf(util.roleOf("+R"))).toBe("+R@");
    expect(util.isDropOrig("R@")).toBe(true);
    expect(util.isDropOrig("a@")).toBe(false);
  });

  it("keeps Study manual arrows independent of automatically generated hints", () => {
    const api = mount({ fen: "8/8/8/8/8/8/8/8" });
    const user = { orig: "a1", dest: "h8", brush: "green" };
    const hint = { orig: "b1", dest: "b8", brush: "blue" };
    api.setShapes([user]);
    api.setAutoShapes([hint]);
    api.setAutoShapes([]);
    expect(api.state.drawable.shapes).toEqual([user]);
    expect(api.state.drawable.autoShapes).toEqual([]);
    api.destroy();
  });

  it("keeps custom premove and predrop hooks supplied by PyChess round controller", () => {
    const premove = vi.fn(() => ["c3"]);
    const predrop = vi.fn(() => ["d4"]);
    const api = mount({ premovable: { premoveFunc: premove, predropFunc: predrop } });
    expect(api.state.premovable.premoveFunc).toBe(premove);
    expect(api.state.premovable.predropFunc).toBe(predrop);
    api.destroy();
  });

  it("preserves configurable king roles and per-color pocket roles", () => {
    const api = mount({
      fen: "8/8/8/8/8/8/8/8[PNpn]",
      kingRoles: ["a-piece"],
      pocketRoles: { white: ["p-piece", "n-piece"], black: ["p-piece", "n-piece"] },
    });
    expect(api.state.kingRoles).toEqual(["a-piece"]);
    expect(api.state.pocketRoles?.white).toEqual(["p-piece", "n-piece"]);
    expect(api.state.boardState.pockets?.white.get("n-piece")).toBe(1);
    expect(api.state.boardState.pockets?.black.get("p-piece")).toBe(1);
    api.destroy();
  });

  it("keeps PyChess key conversion stable on ten-rank and sixteen-rank boards", () => {
    for (const dimensions of [
      { width: 9, height: 10 },
      { width: 16, height: 16 },
    ]) {
      for (const key of util.allKeys(dimensions)) {
        expect(util.pos2key(util.key2pos(key))).toBe(key);
      }
    }
    expect(util.pos2key([0, 15])).toBe("a@");
  });
});
