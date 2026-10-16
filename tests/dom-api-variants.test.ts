import { describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { Notation } from "../src/types";

function mount(config: Parameters<typeof Chessground>[1], mini = false) {
  const root = document.createElement("div");
  if (mini) root.className = "mini";
  document.body.append(root);
  const api = Chessground(root, { animation: { enabled: false }, ...config });
  return { root, api };
}

describe("ChessgroundX DOM and public API compatibility", () => {
  it("renders a 16x16 board, its coordinates and custom piece roles", () => {
    const { root, api } = mount({
      dimensions: { width: 16, height: 16 },
      fen: `R15/${Array(15).fill("16").join("/")}`,
    });
    expect(root.querySelectorAll("coords.bottom coord")).toHaveLength(16);
    expect(root.querySelectorAll("coords.side coord")).toHaveLength(16);
    expect(root.querySelector("cg-board piece.r-piece.white")).not.toBeNull();
    expect(api.getFen()).toBe(`R15/${Array(15).fill("16").join("/")}`);
    api.destroy();
  });

  it("supports Shogi and Xiangqi coordinate layouts", () => {
    const shogi = mount({
      dimensions: { width: 9, height: 9 },
      notation: Notation.SHOGI_HANNUM,
      fen: Array(9).fill("9").join("/"),
    });
    expect(shogi.root.querySelectorAll("coords.top coord")).toHaveLength(9);
    expect(shogi.root.querySelectorAll("coords.side coord")).toHaveLength(9);
    shogi.api.destroy();
    const xiangqi = mount({
      dimensions: { width: 9, height: 10 },
      notation: Notation.XIANGQI_HANNUM,
      fen: Array(10).fill("9").join("/"),
    });
    expect(xiangqi.root.querySelectorAll("coords.top coord")).toHaveLength(9);
    expect(xiangqi.root.querySelectorAll("coords.bottom coord")).toHaveLength(9);
    xiangqi.api.destroy();
  });

  it("changes orientation without altering the position", () => {
    const { root, api } = mount({ fen: "8/8/8/8/8/8/8/4K3" });
    const before = api.getFen();
    expect(root.classList.contains("orientation-white")).toBe(true);
    api.toggleOrientation();
    expect(root.classList.contains("orientation-black")).toBe(true);
    expect(api.getFen()).toBe(before);
    api.destroy();
  });

  it("exposes custom board dimensions to CSS", () => {
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 800,
      width: 1000,
      height: 800,
      toJSON: () => ({}),
    });
    const css = document.createElement("div");
    document.body.append(css);
    const { api } = mount({ dimensions: { width: 10, height: 8 }, addDimensionsCssVarsTo: css });
    expect(css.style.getPropertyValue("--cg-width")).toBe("1000px");
    expect(css.style.getPropertyValue("--cg-height")).toBe("800px");
    api.destroy();
    rect.mockRestore();
  });

  it("updates full-FEN three-check counters only when FEN changes", () => {
    const { api } = mount({ fen: "8/8/8/8/8/8/8/8 w - - 3+2 0 1" });
    expect(api.state.drawable.checkCounters).toEqual({ black: "3", white: "2" });
    api.setPieces(new Map([["a1", { role: "k-piece", color: "white" }]]));
    expect(api.state.drawable.checkCounters).toEqual({ black: "3", white: "2" });
    api.set({ fen: "8/8/8/8/8/8/8/8 w - - 1+0 0 1" });
    expect(api.state.drawable.checkCounters).toEqual({ black: "1", white: "0" });
    api.destroy();
  });

  it("provides a role-based drop-origin API without confusing rank 16", () => {
    const { api } = mount({
      fen: "8/8/8/8/8/8/8/8[R]",
      pocketRoles: { white: ["r-piece"], black: [] },
    });
    api.move("R@", "e4");
    expect(api.state.boardState.pieces.get("e4")).toMatchObject({
      role: "r-piece",
      color: "white",
    });
    expect(api.state.lastMove).toEqual(["R@", "e4"]);
    api.destroy();
  });

  it("renders pockets for embedded mini boards", () => {
    const { root, api } = mount(
      { fen: "8/8/8/8/8/8/8/8[2Rr]", pocketRoles: { white: ["r-piece"], black: ["r-piece"] } },
      true,
    );
    expect(root.querySelector("pocketbottom.pocket")).not.toBeNull();
    expect(root.querySelector("pockettop.pocket")).not.toBeNull();
    expect(root.querySelectorAll("pocketbottom piece")).toHaveLength(1);
    expect(root.querySelectorAll("pockettop piece")).toHaveLength(1);
    api.destroy();
  });

  it("renders shapes and preserves auto shapes separately", () => {
    const { root, api } = mount({ fen: "8/8/8/8/8/8/8/8" });
    api.setShapes([{ orig: "a1", dest: "h8", brush: "green" }]);
    api.setAutoShapes([{ orig: "b2", brush: "blue" }]);
    expect(api.state.drawable.shapes).toHaveLength(1);
    expect(api.state.drawable.autoShapes).toHaveLength(1);
    expect(root.querySelector("svg.cg-shapes")).not.toBeNull();
    api.state.dom.redrawNow();
    expect(root.querySelector("svg.cg-shapes g")?.childElementCount).toBeGreaterThan(0);
    api.destroy();
  });

  it("rebuilds DOM on orientation change and fires insert callback", () => {
    const insert = vi.fn();
    const { api } = mount({ events: { insert } });
    expect(insert).toHaveBeenCalledTimes(1);
    api.toggleOrientation();
    expect(insert).toHaveBeenCalledTimes(2);
    api.destroy();
  });

  it("can destroy document listeners and marks its state as destroyed", () => {
    const { api } = mount({});
    api.destroy();
    expect(api.state.dom.destroyed).toBe(true);
  });
});
